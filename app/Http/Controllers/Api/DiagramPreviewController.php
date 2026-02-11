<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagram;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DiagramPreviewController extends Controller
{
    public function store(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('update', $diagram);

        $validated = $request->validate([
            'preview' => ['required', 'file', 'mimes:png', 'max:4096'],
        ]);

        $path = "diagram-previews/{$diagram->id}.png";
        Storage::disk('public')->putFileAs('diagram-previews', $validated['preview'], "{$diagram->id}.png");

        $diagram->update([
            'preview_path' => $path,
        ]);

        return response()->json([
            'diagram' => $diagram->fresh(),
            'preview_url' => Storage::url($path),
        ]);
    }
}

