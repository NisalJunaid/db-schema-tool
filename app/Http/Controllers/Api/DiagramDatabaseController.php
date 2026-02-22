<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagram;
use App\Models\DiagramDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiagramDatabaseController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'diagram_id' => ['required', 'integer', 'exists:diagrams,id'],
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
            'x' => ['nullable', 'integer'],
            'y' => ['nullable', 'integer'],
            'width' => ['nullable', 'integer', 'min:200'],
            'height' => ['nullable', 'integer', 'min:200'],
        ]);

        $diagram = Diagram::query()->findOrFail((int) $validated['diagram_id']);
        $this->authorize('edit', $diagram);

        $database = DiagramDatabase::create([
            ...$validated,
            'x' => $validated['x'] ?? 0,
            'y' => $validated['y'] ?? 0,
            'width' => $validated['width'] ?? 1200,
            'height' => $validated['height'] ?? 800,
        ]);

        return response()->json($database, 201);
    }

    public function update(Request $request, DiagramDatabase $diagramDatabase): JsonResponse
    {
        $this->authorize('edit', $diagramDatabase->diagram);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
            'x' => ['sometimes', 'required', 'integer'],
            'y' => ['sometimes', 'required', 'integer'],
            'width' => ['sometimes', 'required', 'integer', 'min:200'],
            'height' => ['sometimes', 'required', 'integer', 'min:200'],
        ]);

        $diagramDatabase->update($validated);

        return response()->json($diagramDatabase->fresh());
    }

    public function destroy(DiagramDatabase $diagramDatabase): JsonResponse
    {
        $diagram = $diagramDatabase->diagram;
        $this->authorize('edit', $diagram);

        $defaultDatabase = DiagramDatabase::firstOrCreate(
            ['diagram_id' => $diagram->id, 'name' => 'Default'],
            ['color' => '#64748b', 'x' => 0, 'y' => 0, 'width' => 1200, 'height' => 800],
        );

        $diagram->diagramTables()
            ->where('database_id', $diagramDatabase->id)
            ->update(['database_id' => $defaultDatabase->id]);

        $diagramDatabase->delete();

        return response()->json(['status' => 'deleted', 'moved_to_database_id' => $defaultDatabase->id]);
    }
}
