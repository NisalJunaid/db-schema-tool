<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateDiagramRequest;
use App\Models\Diagram;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiagramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Diagram::class);

        $user = $request->user();
        $teamIds = $user->teams()->pluck('teams.id')->all();

        $diagrams = Diagram::query()
            ->with('owner')
            ->where(function ($query) use ($user, $teamIds) {
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
            })
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
}
