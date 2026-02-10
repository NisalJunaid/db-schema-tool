<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDiagramTableRequest;
use App\Http\Requests\UpdateDiagramTableRequest;
use App\Models\DiagramTable;
use Illuminate\Http\JsonResponse;

class DiagramTableController extends Controller
{
    public function store(StoreDiagramTableRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $this->authorize('update', $request->diagram());

        $diagramTable = DiagramTable::create($validated);

        return response()->json($diagramTable, 201);
    }

    public function update(UpdateDiagramTableRequest $request, DiagramTable $diagramTable): JsonResponse
    {
        $this->authorize('update', $diagramTable->diagram);

        $diagramTable->update($request->validated());

        return response()->json($diagramTable->fresh());
    }

    public function destroy(DiagramTable $diagramTable): JsonResponse
    {
        $this->authorize('update', $diagramTable->diagram);

        $diagramTable->delete();

        return response()->noContent();
    }
}
