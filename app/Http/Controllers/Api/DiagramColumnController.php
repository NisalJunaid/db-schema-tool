<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiagramColumn;
use App\Http\Requests\UpdateColumnRequest;
use App\Models\DiagramTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
            'enum_values' => ['nullable', 'array'],
            'enum_values.*' => ['nullable', 'string', 'max:255'],
            'length' => ['nullable', 'integer', 'min:1'],
            'precision' => ['nullable', 'integer', 'min:1'],
            'scale' => ['nullable', 'integer', 'min:0'],
            'unsigned' => ['sometimes', 'boolean'],
            'auto_increment' => ['sometimes', 'boolean'],
            'nullable' => ['sometimes', 'boolean'],
            'primary' => ['sometimes', 'boolean'],
            'unique' => ['sometimes', 'boolean'],
            'default' => ['nullable', 'string', 'max:255'],
            'collation' => ['nullable', 'string', 'max:255'],
            'index_type' => ['nullable', 'in:primary,unique,index'],
            'on_delete' => ['nullable', 'string', 'max:255'],
            'on_update' => ['nullable', 'string', 'max:255'],
        ]);

        if (strtoupper((string) ($validated['type'] ?? '')) === 'ENUM') {
            $request->validate([
                'enum_values' => ['required', 'array', 'min:1'],
            ]);
        }

        $diagramTable = DiagramTable::query()->findOrFail($request->integer('diagram_table_id'));

        $this->authorize('edit', $diagramTable->diagram);

        $diagramColumn = DiagramColumn::create($validated);

        return response()->json($diagramColumn, 201);
    }

    public function update(UpdateColumnRequest $request, DiagramColumn $diagramColumn): JsonResponse
    {
        $this->authorize('edit', $diagramColumn->diagramTable->diagram);

        $validated = $request->validated();

        if (array_key_exists('name', $validated)) {
            validator($validated, [
                'name' => [
                    'sometimes',
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('diagram_columns')
                        ->ignore($diagramColumn->getKey())
                        ->where(fn ($query) => $query->where('diagram_table_id', $diagramColumn->diagram_table_id)),
                ],
            ])->validate();
        }

        if (strtoupper((string) ($validated['type'] ?? $diagramColumn->type)) === 'ENUM') {
            validator($validated, [
                'enum_values' => ['required', 'array', 'min:1'],
            ])->validate();
        }

        $diagramColumn->update($validated);

        return response()->json($diagramColumn->fresh());
    }

    public function destroy(DiagramColumn $diagramColumn): Response
    {
        $this->authorize('edit', $diagramColumn->diagramTable->diagram);

        $diagramColumn->delete();

        return response()->noContent();
    }
}
