<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teams = $request->user()
            ->teams()
            ->with('owner:id,name,email')
            ->select('teams.id', 'teams.name', 'teams.owner_user_id', 'team_user.role')
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
        abort_unless($request->user()->teams()->whereKey($team->getKey())->exists(), 403);

        $team->load(['owner:id,name,email', 'users:id,name,email']);

        $members = $team->users->map(function ($member) {
            return [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->pivot?->role,
            ];
        })->values();

        return response()->json([
            'id' => $team->id,
            'name' => $team->name,
            'owner' => $team->owner,
            'members' => $members,
            'can_manage' => $request->user()->hasTeamRole($team, ['admin', 'owner']),
        ]);
    }
}
