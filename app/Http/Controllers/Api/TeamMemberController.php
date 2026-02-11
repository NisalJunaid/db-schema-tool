<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeamMemberController extends Controller
{
    public function store(Request $request, Team $team): JsonResponse
    {
        $this->authorize('manageTeam', $team);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', Rule::in(['member', 'editor', 'admin'])],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => ['email' => ['No user found with that email address.']],
            ], 422);
        }

        $team->users()->syncWithoutDetaching([$user->id => ['role' => $validated['role']]]);

        return response()->json(['message' => 'Member added successfully.']);
    }

    public function update(Request $request, Team $team, User $user): JsonResponse
    {
        $this->authorize('manageTeam', $team);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['member', 'editor', 'admin'])],
        ]);

        $team->users()->updateExistingPivot($user->id, ['role' => $validated['role']]);

        return response()->json(['message' => 'Member role updated.']);
    }

    public function destroy(Request $request, Team $team, User $user): JsonResponse
    {
        $this->authorize('manageTeam', $team);

        if ((int) $team->owner_user_id === (int) $user->id) {
            return response()->json(['message' => 'Team owner cannot be removed.'], 422);
        }

        $team->users()->detach($user->id);

        return response()->noContent();
    }
}
