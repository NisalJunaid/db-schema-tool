<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagram;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiagramPreviewController extends Controller
{
    public function store(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('update', $diagram);

        $validated = $request->validate([
            'preview' => ['required', 'image', 'max:4096'],
        ]);

        $path = $validated['preview']->store('diagram-previews', 'public');

        $diagram->preview_path = $path;
        $diagram->save();

        return response()->json([
            'preview_path' => $path,
            'preview_url' => $diagram->preview_url,
        ]);
    }
}
