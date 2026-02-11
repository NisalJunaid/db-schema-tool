<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'permissions']);

        return response()->json($users);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $validated = $request->validate([
            'role' => ['required', Rule::in(['super_admin', 'admin', 'member'])],
        ]);

        $user->update(['role' => $validated['role']]);

        return response()->json($user->only('id', 'role'));
    }

    public function updatePermissions(Request $request, User $user): JsonResponse
    {
        $this->authorizeAdmin($request->user());

        $validated = $request->validate([
            'permissions' => ['array'],
            'permissions.*' => ['string'],
        ]);

        $user->update(['permissions' => $validated['permissions'] ?? []]);

        return response()->json($user->only('id', 'permissions'));
    }

    private function authorizeAdmin(User $user): void
    {
        abort_unless($user->hasAppRole(['admin', 'super_admin']), 403);
    }
}
