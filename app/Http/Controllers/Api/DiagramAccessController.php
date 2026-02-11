<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagram;
use App\Models\DiagramAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiagramAccessController extends Controller
{
    public function index(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('view', $diagram);

        $access = $diagram->accessEntries()->orderBy('subject_type')->get();

        return response()->json([
            'is_public' => $diagram->is_public,
            'entries' => $access,
        ]);
    }

    public function store(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('manageAccess', $diagram);

        $validated = $request->validate([
            'subject_type' => ['required', Rule::in(['user', 'team'])],
            'subject_id' => ['required', 'integer', 'min:1'],
            'role' => ['required', Rule::in(['viewer', 'editor', 'admin'])],
        ]);

        $entry = DiagramAccess::updateOrCreate(
            [
                'diagram_id' => $diagram->id,
                'subject_type' => $validated['subject_type'],
                'subject_id' => $validated['subject_id'],
            ],
            ['role' => $validated['role']],
        );

        return response()->json($entry, 201);
    }

    public function update(Request $request, Diagram $diagram, DiagramAccess $access): JsonResponse
    {
        $this->authorize('manageAccess', $diagram);
        abort_unless((int) $access->diagram_id === (int) $diagram->id, 404);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['viewer', 'editor', 'admin'])],
        ]);

        $access->update(['role' => $validated['role']]);

        return response()->json($access->fresh());
    }

    public function destroy(Request $request, Diagram $diagram, DiagramAccess $access): JsonResponse
    {
        $this->authorize('manageAccess', $diagram);
        abort_unless((int) $access->diagram_id === (int) $diagram->id, 404);

        $access->delete();

        return response()->noContent();
    }

    public function updateVisibility(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('manageAccess', $diagram);

        $validated = $request->validate([
            'is_public' => ['required', 'boolean'],
        ]);

        $diagram->update(['is_public' => $validated['is_public']]);

        return response()->json($diagram->only('id', 'is_public'));
    }
}
