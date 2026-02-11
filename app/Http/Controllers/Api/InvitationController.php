<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\InvitationMail;
use App\Models\Diagram;
use App\Models\DiagramAccess;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class InvitationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $email = Invitation::normalizeEmail($user->email);

        Invitation::query()
            ->where('status', 'pending')
            ->where('expires_at', '<', now())
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->update(['status' => 'expired']);

        $invitations = Invitation::query()
            ->with(['inviter:id,name,email', 'team:id,name', 'diagram:id,name'])
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->latest()
            ->get();

        return response()->json($invitations);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasAppRole(['admin', 'super_admin']), 403);

        $invitations = Invitation::query()
            ->with(['inviter:id,name,email', 'team:id,name', 'diagram:id,name'])
            ->latest()
            ->get();

        return response()->json($invitations);
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        if (! $request->user()) {
            $request->session()->put('pending_invitation_token', $token);

            return redirect()->route('login', ['invitation' => $token]);
        }

        $invitation = Invitation::query()->where('token', $token)->first();

        if (! $invitation) {
            return redirect()->route('dashboard')->with('status', 'Invitation not found.');
        }

        if (Invitation::normalizeEmail($request->user()->email) !== Invitation::normalizeEmail($invitation->email)) {
            return redirect()->route('dashboard')->with('status', 'This invitation belongs to a different email address.');
        }

        [$accepted, $message] = self::acceptInvitationForUser($request->user(), $invitation);

        $request->session()->forget('pending_invitation_token');

        if (! $accepted) {
            return redirect()->route('dashboard')->with('status', $message);
        }

        if ($invitation->type === 'team' && $invitation->team_id) {
            return redirect()->route('teams.show', ['team' => $invitation->team_id])->with('status', $message);
        }

        if ($invitation->diagram_id) {
            return redirect()->route('diagrams.editor', ['diagram' => $invitation->diagram_id])->with('status', $message);
        }

        return redirect()->route('dashboard')->with('status', $message);
    }

    public function acceptInApp(Request $request, Invitation $invitation): JsonResponse
    {
        if (Invitation::normalizeEmail($request->user()->email) !== Invitation::normalizeEmail($invitation->email)) {
            abort(403);
        }

        [$accepted, $message] = self::acceptInvitationForUser($request->user(), $invitation);

        return response()->json([
            'ok' => $accepted,
            'message' => $message,
            'invitation' => $invitation->fresh(),
            'diagram' => $accepted ? $this->resolveDiagramPayload($request->user(), $invitation) : null,
        ], $accepted ? 200 : 422);
    }

    public function declineInApp(Request $request, Invitation $invitation): JsonResponse
    {
        if (Invitation::normalizeEmail($request->user()->email) !== Invitation::normalizeEmail($invitation->email)) {
            abort(403);
        }

        if ($invitation->status !== 'pending') {
            return response()->json([
                'ok' => false,
                'message' => 'Invitation has already been processed.',
            ], 422);
        }

        if ($invitation->isExpired()) {
            $invitation->update(['status' => 'expired']);

            return response()->json([
                'ok' => false,
                'message' => 'Invitation has expired.',
                'invitation' => $invitation->fresh(),
            ], 422);
        }

        $invitation->update(['status' => 'declined']);

        return response()->json([
            'ok' => true,
            'message' => 'Invitation declined.',
            'invitation' => $invitation->fresh(),
        ]);
    }

    public function resend(Request $request, Invitation $invitation): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasAppRole(['admin', 'super_admin'])) {
            abort_unless($invitation->type === 'team' && $invitation->team, 403);
            $this->authorize('manageTeam', $invitation->team);
        }

        $invitation->loadMissing(['inviter:id,name,email', 'team:id,name', 'diagram:id,name']);

        $mailStatus = self::sendInvitationMail($invitation);

        return response()->json([
            'message' => $mailStatus['success'] ? 'Invitation email resent.' : 'Invitation email resend failed, invitation is still active.',
            'invitation' => $invitation->fresh(),
        ]);
    }

    private function resolveDiagramPayload(User $user, Invitation $invitation): ?array
    {
        if (! $invitation->diagram_id) {
            return null;
        }

        $diagram = Diagram::query()->with('owner')->find($invitation->diagram_id);

        if (! $diagram) {
            return null;
        }

        return [
            'id' => $diagram->id,
            'name' => $diagram->name,
            'owner_type' => $diagram->owner_type,
            'owner_id' => $diagram->owner_id,
            'owner_name' => $diagram->owner?->name,
            'is_public' => $diagram->is_public,
            'preview_image' => $diagram->preview_image,
            'preview_path' => $diagram->preview_path,
            'preview_url' => $diagram->preview_url,
            'is_directly_shared' => $diagram->accessEntries()
                ->where('subject_type', 'user')
                ->where('subject_id', $user->getKey())
                ->exists(),
            'updated_at' => $diagram->updated_at,
            'permissions' => [
                'canView' => $user->can('view', $diagram),
                'canEdit' => $user->can('edit', $diagram),
                'canManageAccess' => $user->can('manageAccess', $diagram),
                'canDelete' => $user->can('delete', $diagram),
            ],
        ];
    }

    public static function sendInvitationMail(Invitation $invitation): array
    {
        try {
            Mail::to($invitation->email)->send(new InvitationMail($invitation));
            $invitation->update([
                'email_status' => 'sent',
                'email_last_error' => null,
            ]);

            return ['success' => true, 'error' => null];
        } catch (\Throwable $exception) {
            $invitation->update([
                'email_status' => 'failed',
                'email_last_error' => mb_substr($exception->getMessage(), 0, 1000),
            ]);

            return ['success' => false, 'error' => $exception->getMessage()];
        }
    }

    public static function consumePendingInvitation(Request $request): void
    {
        $token = $request->session()->pull('pending_invitation_token');

        if (! $token || ! $request->user()) {
            return;
        }

        $invitation = Invitation::query()->where('token', $token)->first();

        if (! $invitation) {
            return;
        }

        if (Invitation::normalizeEmail($request->user()->email) !== Invitation::normalizeEmail($invitation->email)) {
            return;
        }

        self::acceptInvitationForUser($request->user(), $invitation);
    }

    public static function acceptInvitationForUser(User $user, Invitation $invitation): array
    {
        if ($invitation->status !== 'pending') {
            return [false, 'Invitation has already been processed.'];
        }

        if ($invitation->isExpired()) {
            $invitation->update(['status' => 'expired']);

            return [false, 'Invitation has expired.'];
        }

        if ($invitation->type === 'team' && $invitation->team_id) {
            self::syncTeamMembershipRole($user, $invitation->team()->first(), $invitation->role);
        }

        if ($invitation->diagram_id) {
            DiagramAccess::updateOrCreate(
                [
                    'diagram_id' => $invitation->diagram_id,
                    'subject_type' => 'user',
                    'subject_id' => $user->id,
                ],
                ['role' => self::normalizeInvitationRole($invitation->role)],
            );
        }

        $invitation->update(['status' => 'accepted']);

        return [true, 'Invitation accepted successfully.'];
    }

    private static function syncTeamMembershipRole(User $user, ?Team $team, string $invitedRole): void
    {
        if (! $team || $user->isTeamOwner($team)) {
            return;
        }

        $normalizedInvitedRole = self::normalizeInvitationRole($invitedRole);
        $member = $team->users()->whereKey($user->getKey())->first();

        if (! $member) {
            $team->users()->attach($user->getKey(), ['role' => $normalizedInvitedRole]);

            return;
        }

        $currentRole = self::normalizeInvitationRole((string) ($member->pivot?->role ?? 'viewer'));

        if (self::roleRank($normalizedInvitedRole) > self::roleRank($currentRole)) {
            $team->users()->updateExistingPivot($user->getKey(), ['role' => $normalizedInvitedRole]);
        }
    }

    private static function normalizeInvitationRole(?string $role): string
    {
        return match (strtolower((string) $role)) {
            'admin' => 'admin',
            'editor' => 'editor',
            default => 'viewer',
        };
    }

    private static function roleRank(string $role): int
    {
        return match (self::normalizeInvitationRole($role)) {
            'admin' => 3,
            'editor' => 2,
            default => 1,
        };
    }
}
