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
        $this->authorize('edit', $diagram);

        $request->validate([
            'preview' => 'required|image',
        ]);

        $path = $request->file('preview')
            ->store('diagram-previews', 'public');

        $diagram->preview_path = $path;
        $diagram->save();

        return response()->json([
            'preview_path' => $path,
            'preview_url' => asset('storage/' . $path),
        ]);
    }
}
