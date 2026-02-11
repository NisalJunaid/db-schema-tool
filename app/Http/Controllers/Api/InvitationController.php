<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiagramAccess;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function index(Request $request): JsonResponse
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

            return redirect()->route('login');
        }

        $invitation = Invitation::query()->where('token', $token)->first();

        if (! $invitation) {
            return redirect()->route('dashboard')->with('status', 'Invitation not found.');
        }

        if (strcasecmp($request->user()->email, $invitation->email) !== 0) {
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

        if (strcasecmp($request->user()->email, $invitation->email) !== 0) {
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
            $invitation->team()->first()?->users()->syncWithoutDetaching([
                $user->id => ['role' => $invitation->role],
            ]);
        }

        if ($invitation->diagram_id) {
            DiagramAccess::updateOrCreate(
                [
                    'diagram_id' => $invitation->diagram_id,
                    'subject_type' => 'user',
                    'subject_id' => $user->id,
                ],
                ['role' => $invitation->role === 'member' ? 'viewer' : $invitation->role],
            );
        }

        $invitation->update(['status' => 'accepted']);

        return [true, 'Invitation accepted successfully.'];
    }
}
