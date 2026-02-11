<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagram;
use App\Models\DiagramColumn;
use App\Models\DiagramRelationship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DiagramRelationshipController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'diagram_id' => ['required', 'integer', 'exists:diagrams,id'],
            'from_column_id' => ['required', 'integer', 'exists:diagram_columns,id', 'different:to_column_id'],
            'to_column_id' => ['required', 'integer', 'exists:diagram_columns,id', 'different:from_column_id'],
            'type' => ['required', Rule::in(['one_to_one', 'one_to_many', 'many_to_many'])],
            'on_delete' => ['nullable', 'string', 'max:255'],
            'on_update' => ['nullable', 'string', 'max:255'],
        ]);

        $diagram = Diagram::query()->findOrFail($validated['diagram_id']);

        $this->authorize('edit', $diagram);

        $fromColumn = DiagramColumn::query()
            ->with('diagramTable:id,diagram_id')
            ->findOrFail($validated['from_column_id']);

        $toColumn = DiagramColumn::query()
            ->with('diagramTable:id,diagram_id')
            ->findOrFail($validated['to_column_id']);

        if (
            (int) $fromColumn->diagramTable->diagram_id !== (int) $diagram->getKey()
            || (int) $toColumn->diagramTable->diagram_id !== (int) $diagram->getKey()
        ) {
            throw ValidationException::withMessages([
                'from_column_id' => ['Both columns must belong to the selected diagram.'],
                'to_column_id' => ['Both columns must belong to the selected diagram.'],
            ]);
        }

        $exists = DiagramRelationship::query()
            ->where('diagram_id', $diagram->getKey())
            ->where('from_column_id', $validated['from_column_id'])
            ->where('to_column_id', $validated['to_column_id'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'to_column_id' => ['This relationship already exists.'],
            ]);
        }

        $relationship = DiagramRelationship::create($validated);

        return response()->json($relationship, 201);
    }

    public function update(Request $request, DiagramRelationship $diagramRelationship): JsonResponse
    {
        $this->authorize('edit', $diagramRelationship->diagram);

        $validated = $request->validate([
            'type' => ['required', Rule::in(['one_to_one', 'one_to_many', 'many_to_many'])],
        ]);

        $diagramRelationship->update($validated);

        return response()->json($diagramRelationship->fresh());
    }

    public function destroy(DiagramRelationship $diagramRelationship): JsonResponse
    {
        $this->authorize('edit', $diagramRelationship->diagram);

        $diagramRelationship->delete();

        return response()->json(null, 204);
    }
}
