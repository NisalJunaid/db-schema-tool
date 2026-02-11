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
        $this->authorize('edit', $diagram);

        $validated = $request->validate([
            'preview' => ['required', 'image', 'max:4096'],
        ]);

        $path = 'diagram-previews/'.$diagram->getKey().'.png';
        Storage::disk('public')->putFileAs('diagram-previews', $validated['preview'], $diagram->getKey().'.png');

        $diagram->update(['preview_path' => $path]);

        return response()->json([
            'preview_path' => $path,
            'preview_url' => $diagram->fresh()->preview_url,
        ]);
    }
}
