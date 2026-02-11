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
            ->map(function (Diagram $diagram) {
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

    public function show(Diagram $diagram): JsonResponse
    {
        $this->authorize('view', $diagram);

        $diagram->load(['diagramTables.diagramColumns', 'diagramRelationships']);

        return response()->json($diagram);
    }

    public function update(UpdateDiagramRequest $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('update', $diagram);

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

        $invitation = Invitation::create([
            'email' => Invitation::normalizeEmail($validated['email']),
            'inviter_user_id' => $request->user()->id,
            'type' => $scope === 'team' && $diagram->owner_type === 'team' ? 'team' : 'diagram',
            'team_id' => $diagram->owner_type === 'team' ? $diagram->owner_id : null,
            'diagram_id' => $scope === 'diagram' || $diagram->owner_type !== 'team' ? $diagram->id : null,
            'role' => $validated['role'],
            'email_status' => 'pending',
        ]);

        $invitation->load(['inviter:id,name,email', 'team:id,name', 'diagram:id,name']);
        InvitationController::sendInvitationMail($invitation);

        $existingUser = User::query()->whereRaw('LOWER(TRIM(email)) = ?', [Invitation::normalizeEmail($validated['email'])])->exists();

        return response()->json([
            'message' => 'Invite created successfully.',
            'registered_user' => $existingUser,
            'invitation' => $invitation,
        ], 201);
    }
}
