<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Team::class);

        $teamsQuery = $request->user()->hasAppRole(['admin', 'super_admin'])
            ? Team::query()
            : $request->user()->teams();

        $teams = $teamsQuery
            ->with('owner:id,name,email')
            ->select('teams.id', 'teams.name', 'teams.owner_user_id')
            ->orderBy('teams.name')
            ->get()
            ->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'owner_user_id' => $team->owner_user_id,
                'owner' => $team->owner,
                'permissions' => [
                    'canManageMembers' => $request->user()->can('manageMembers', $team),
                    'canManageTeam' => $request->user()->can('manageTeam', $team),
                ],
            ])
            ->values();

        return response()->json($teams);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $team = Team::create([
            'name' => $validated['name'],
            'owner_user_id' => $request->user()->getKey(),
        ]);

        $team->users()->attach($request->user()->getKey(), ['role' => 'owner']);

        return response()->json($team->load('owner:id,name,email'), 201);
    }

    public function show(Request $request, Team $team): JsonResponse
    {
        $this->authorize('view', $team);
        $this->authorize('viewMembers', $team);

        $team->load(['owner:id,name,email', 'users:id,name,email', 'diagrams:id,name,owner_id,owner_type']);

        $members = $team->users->map(fn ($member) => [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'role' => $member->pivot?->role,
        ])->values();

        return response()->json([
            'id' => $team->id,
            'name' => $team->name,
            'owner' => $team->owner,
            'members' => $members,
            'diagrams' => $team->diagrams,
            'permissions' => [
                'canManageMembers' => $request->user()->can('manageMembers', $team),
                'canManageTeam' => $request->user()->can('manageTeam', $team),
            ],
        ]);
    }

    public function invite(Request $request, Team $team): JsonResponse
    {
        $this->authorize('manageTeam', $team);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', Rule::in(['member', 'editor', 'admin'])],
            'diagram_ids' => ['nullable', 'array'],
            'diagram_ids.*' => [
                'integer',
                Rule::exists('diagrams', 'id')->where(fn ($query) => $query->where('owner_type', 'team')->where('owner_id', $team->id)),
            ],
        ]);

        $email = Invitation::normalizeEmail($validated['email']);

        $alreadyInTeam = $team->users()
            ->whereRaw('LOWER(TRIM(users.email)) = ?', [$email])
            ->exists();

        if ($alreadyInTeam) {
            throw ValidationException::withMessages([
                'email' => ['User already in team.'],
            ]);
        }

        $pendingTeamInvitation = Invitation::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->where('type', 'team')
            ->where('team_id', $team->id)
            ->where('status', 'pending')
            ->exists();

        if ($pendingTeamInvitation) {
            throw ValidationException::withMessages([
                'email' => ['Invitation already sent.'],
            ]);
        }

        $invitation = Invitation::create([
            'email' => $email,
            'inviter_user_id' => $request->user()->id,
            'type' => 'team',
            'team_id' => $team->id,
            'role' => $validated['role'],
            'email_status' => 'pending',
        ]);

        foreach (($validated['diagram_ids'] ?? []) as $diagramId) {
            $pendingDiagramInvitation = Invitation::query()
                ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                ->where('type', 'diagram')
                ->where('diagram_id', (int) $diagramId)
                ->where('status', 'pending')
                ->exists();

            if ($pendingDiagramInvitation) {
                throw ValidationException::withMessages([
                    'email' => ['Invitation already sent.'],
                ]);
            }

            Invitation::create([
                'email' => $email,
                'inviter_user_id' => $request->user()->id,
                'type' => 'diagram',
                'team_id' => $team->id,
                'diagram_id' => (int) $diagramId,
                'role' => $validated['role'] === 'member' ? 'viewer' : $validated['role'],
                'email_status' => 'pending',
            ]);
        }

        $invitation->load(['inviter:id,name,email', 'team:id,name']);
        InvitationController::sendInvitationMail($invitation);

        $existingUser = User::query()->whereRaw('LOWER(TRIM(email)) = ?', [$email])->exists();

        return response()->json([
            'message' => 'Invite created successfully.',
            'registered_user' => $existingUser,
            'invitation' => $invitation,
        ], 201);
    }
}
