<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateDiagramRequest;
use App\Models\Diagram;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DiagramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Diagram::class);

        $user = $request->user();
        $teamIds = $user->teams()->pluck('teams.id')->all();

        $query = Diagram::query()->with('owner');

        if (! $user->hasAppRole(['admin', 'super_admin'])) {
            $query->where(function ($query) use ($user, $teamIds) {
                $query->where(function ($personalQuery) use ($user) {
                    $personalQuery->where('owner_type', 'user')->where('owner_id', $user->getKey());
                })->orWhere(function ($teamQuery) use ($teamIds) {
                    $teamQuery->where('owner_type', 'team')->whereIn('owner_id', $teamIds);
                })->orWhere('is_public', true)->orWhereExists(function ($accessQuery) use ($user, $teamIds) {
                    $accessQuery->from('diagram_access')
                        ->whereColumn('diagram_access.diagram_id', 'diagrams.id')
                        ->where(function ($subjectQuery) use ($user, $teamIds) {
                            $subjectQuery
                                ->where(function ($userQuery) use ($user) {
                                    $userQuery->where('subject_type', 'user')->where('subject_id', $user->getKey());
                                })
                                ->orWhere(function ($teamSubjectQuery) use ($teamIds) {
                                    $teamSubjectQuery->where('subject_type', 'team')->whereIn('subject_id', $teamIds);
                                });
                        });
                });
            });
        }

        $diagrams = $query
            ->latest()
            ->get()
            ->map(function (Diagram $diagram) use ($request) {
                $ownerName = $diagram->owner?->name;

                return [
                    'id' => $diagram->id,
                    'name' => $diagram->name,
                    'owner_type' => $diagram->owner_type,
                    'owner_id' => $diagram->owner_id,
                    'owner_name' => $ownerName,
                    'is_public' => $diagram->is_public,
                    'preview_image' => $diagram->preview_image,
                    'preview_path' => $diagram->preview_path ? Storage::url($diagram->preview_path) : null,
                    'updated_at' => $diagram->updated_at,
                    'permissions' => $this->diagramPermissions($request, $diagram),
                ];
            })
            ->values();

        return response()->json($diagrams);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'owner_type' => ['required', 'string', Rule::in(['user', 'team'])],
            'owner_id' => ['nullable', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'viewport' => ['nullable', 'array'],
            'viewport.x' => ['nullable', 'numeric'],
            'viewport.y' => ['nullable', 'numeric'],
            'viewport.zoom' => ['nullable', 'numeric'],
        ]);

        if ($validated['owner_type'] === 'user') {
            $validated['owner_id'] = (int) $request->user()->getKey();
        } elseif (! Team::query()->whereKey((int) $validated['owner_id'])->exists()) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => [
                    'owner_id' => ['The selected owner id is invalid for team owner type.'],
                ],
            ], 422);
        }

        $this->authorize('create', [Diagram::class, $validated['owner_type'], (int) $validated['owner_id']]);

        $diagram = Diagram::create($validated);

        return response()->json($diagram, 201);
    }

    public function show(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('view', $diagram);

        $diagram->load(['diagramTables.diagramColumns', 'diagramRelationships']);

        return response()->json([
            ...$diagram->toArray(),
            'permissions' => $this->diagramPermissions($request, $diagram),
        ]);
    }

    public function update(UpdateDiagramRequest $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('edit', $diagram);

        $diagram->update($request->validated());

        return response()->json($diagram->fresh());
    }

    public function destroy(Diagram $diagram): JsonResponse
    {
        $this->authorize('delete', $diagram);

        $diagram->delete();

        return response()->noContent();
    }

    public function invite(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('manageAccess', $diagram);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', Rule::in(['viewer', 'editor', 'admin'])],
            'invite_scope' => ['nullable', Rule::in(['diagram', 'team'])],
        ]);

        $scope = $validated['invite_scope'] ?? 'diagram';
        $inviteType = $scope === 'team' && $diagram->owner_type === 'team' ? 'team' : 'diagram';
        $email = Invitation::normalizeEmail($validated['email']);

        $existingUser = User::query()->whereRaw('LOWER(TRIM(email)) = ?', [$email])->first();

        if ($inviteType === 'team') {
            if (! $diagram->owner instanceof Team) {
                throw ValidationException::withMessages([
                    'email' => ['Team invitation is not available for this diagram.'],
                ]);
            }

            $alreadyInTeam = $diagram->owner->users()
                ->whereRaw('LOWER(TRIM(users.email)) = ?', [$email])
                ->exists();

            if ($alreadyInTeam) {
                throw ValidationException::withMessages([
                    'email' => ['User already in team.'],
                ]);
            }

            $pendingInviteExists = Invitation::query()
                ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                ->where('type', 'team')
                ->where('team_id', $diagram->owner_id)
                ->where('status', 'pending')
                ->exists();

            if ($pendingInviteExists) {
                throw ValidationException::withMessages([
                    'email' => ['Invitation already sent.'],
                ]);
            }
        } else {
            if ($existingUser) {
                $isOwner = $diagram->owner_type === 'user'
                    && (int) $diagram->owner_id === (int) $existingUser->getKey();

                $isTeamMember = $diagram->owner_type === 'team'
                    && $existingUser->teams()->whereKey($diagram->owner_id)->exists();

                $hasAccess = $diagram->accessEntries()
                    ->where('subject_type', 'user')
                    ->where('subject_id', $existingUser->getKey())
                    ->exists();

                if ($isOwner || $isTeamMember || $hasAccess) {
                    throw ValidationException::withMessages([
                        'email' => ['User already in team.'],
                    ]);
                }
            }

            $pendingInviteExists = Invitation::query()
                ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                ->where('type', 'diagram')
                ->where('diagram_id', $diagram->id)
                ->where('status', 'pending')
                ->exists();

            if ($pendingInviteExists) {
                throw ValidationException::withMessages([
                    'email' => ['Invitation already sent.'],
                ]);
            }
        }

        $invitation = Invitation::create([
            'email' => $email,
            'inviter_user_id' => $request->user()->id,
            'type' => $inviteType,
            'team_id' => $diagram->owner_type === 'team' ? $diagram->owner_id : null,
            'diagram_id' => $inviteType === 'diagram' ? $diagram->id : null,
            'role' => $validated['role'],
            'email_status' => 'pending',
        ]);

        $invitation->load(['inviter:id,name,email', 'team:id,name', 'diagram:id,name']);
        InvitationController::sendInvitationMail($invitation);

        return response()->json([
            'message' => 'Invite created successfully.',
            'registered_user' => (bool) $existingUser,
            'invitation' => $invitation,
        ], 201);
    }

    private function diagramPermissions(Request $request, Diagram $diagram): array
    {
        $user = $request->user();

        return [
            'canEdit' => $user->can('edit', $diagram),
            'canManageAccess' => $user->can('manageAccess', $diagram),
            'canDelete' => $user->can('delete', $diagram),
        ];
    }
}
