<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\InvitationMail;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

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
            ->get();

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
            'can_manage' => $request->user()->can('manage', $team),
        ]);
    }

    public function invite(Request $request, Team $team): JsonResponse
    {
        $this->authorize('manage', $team);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', Rule::in(['member', 'editor', 'admin'])],
            'diagram_ids' => ['nullable', 'array'],
            'diagram_ids.*' => [
                'integer',
                Rule::exists('diagrams', 'id')->where(fn ($query) => $query->where('owner_type', 'team')->where('owner_id', $team->id)),
            ],
        ]);

        $invitation = Invitation::create([
            'email' => strtolower($validated['email']),
            'inviter_user_id' => $request->user()->id,
            'type' => 'team',
            'team_id' => $team->id,
            'role' => $validated['role'],
        ]);

        foreach (($validated['diagram_ids'] ?? []) as $diagramId) {
            Invitation::create([
                'email' => strtolower($validated['email']),
                'inviter_user_id' => $request->user()->id,
                'type' => 'diagram',
                'team_id' => $team->id,
                'diagram_id' => (int) $diagramId,
                'role' => $validated['role'] === 'member' ? 'viewer' : $validated['role'],
            ]);
        }

        $invitation->load(['inviter:id,name,email', 'team:id,name']);
        Mail::to($invitation->email)->send(new InvitationMail($invitation));

        $existingUser = User::query()->where('email', strtolower($validated['email']))->exists();

        return response()->json([
            'message' => 'Invitation sent successfully.',
            'registered_user' => $existingUser,
            'invitation' => $invitation,
        ], 201);
    }
}
