<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiagramColumn;
use App\Models\DiagramTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiagramColumnController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'diagram_table_id' => ['required', 'integer', 'exists:diagram_tables,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('diagram_columns')->where(
                    fn ($query) => $query->where('diagram_table_id', $request->integer('diagram_table_id'))
                ),
            ],
            'type' => ['required', 'string', 'max:255'],
            'nullable' => ['sometimes', 'boolean'],
            'primary' => ['sometimes', 'boolean'],
            'unique' => ['sometimes', 'boolean'],
            'default' => ['nullable', 'string', 'max:255'],
        ]);

        $diagramTable = DiagramTable::query()->findOrFail($request->integer('diagram_table_id'));

        $this->authorize('update', $diagramTable->diagram);

        $diagramColumn = DiagramColumn::create($validated);

        return response()->json($diagramColumn, 201);
    }

    public function update(Request $request, DiagramColumn $diagramColumn): JsonResponse
    {
        $this->authorize('update', $diagramColumn->diagramTable->diagram);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('diagram_columns')
                    ->ignore($diagramColumn->getKey())
                    ->where(fn ($query) => $query->where('diagram_table_id', $diagramColumn->diagram_table_id)),
            ],
            'type' => ['sometimes', 'required', 'string', 'max:255'],
            'nullable' => ['sometimes', 'boolean'],
            'primary' => ['sometimes', 'boolean'],
            'unique' => ['sometimes', 'boolean'],
            'default' => ['nullable', 'string', 'max:255'],
        ]);

        $diagramColumn->update($validated);

        return response()->json($diagramColumn->fresh());
    }

    public function destroy(DiagramColumn $diagramColumn): JsonResponse
    {
        $this->authorize('update', $diagramColumn->diagramTable->diagram);

        $diagramColumn->delete();

        return response()->noContent();
    }
}
