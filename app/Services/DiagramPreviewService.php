<?php

namespace App\Services;

use App\Models\Diagram;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;

class DiagramPreviewService
{
    public function generate(Diagram $diagram): void
    {
        $diagram->load(['diagramTables.diagramColumns', 'diagramRelationships']);

        $html = View::make('previews.diagram', [
            'diagram' => $diagram,
        ])->render();

        $fileName = 'diagram-previews/'.Str::uuid().'.html';

        Storage::disk('public')->put($fileName, $html);

        $diagram->preview_path = $fileName;
        $diagram->save();
    }
}
