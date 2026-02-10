<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDiagramRequest;
use App\Http\Requests\UpdateDiagramRequest;
use App\Models\Diagram;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiagramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Diagram::class);

        $user = $request->user();
        $teamIds = $user->teams()->pluck('teams.id');

        $diagrams = Diagram::query()
            ->where(function ($query) use ($user, $teamIds) {
                $query->where(function ($personalQuery) use ($user) {
                    $personalQuery
                        ->where('owner_type', User::class)
                        ->where('owner_id', $user->getKey());
                })->orWhere(function ($teamQuery) use ($teamIds) {
                    $teamQuery
                        ->where('owner_type', Team::class)
                        ->whereIn('owner_id', $teamIds);
                });
            })
            ->latest()
            ->get();

        return response()->json($diagrams);
    }

    public function store(StoreDiagramRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->authorize('create', [
            Diagram::class,
            $validated['owner_type'],
            (int) $validated['owner_id'],
        ]);

        $diagram = Diagram::create($validated);

        return response()->json($diagram, 201);
    }

    public function show(Diagram $diagram): JsonResponse
    {
        $this->authorize('view', $diagram);

        $diagram->load([
            'diagramTables.diagramColumns',
            'diagramRelationships',
        ]);

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
