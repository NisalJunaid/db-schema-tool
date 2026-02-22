<?php

namespace App\Http\Controllers;

use App\Models\DiagramShareLink;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DiagramShareViewController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $link = DiagramShareLink::query()
            ->where('token_hash', hash('sha256', $token))
            ->firstOrFail();

        if (! $link->can_view) {
            abort(404);
        }

        if ($link->revoked_at !== null) {
            return Inertia::render('Diagrams/SharedCanvas', [
                'status' => 'revoked',
                'diagram' => null,
                'permissions' => [
                    'canView' => false,
                    'canEdit' => false,
                    'canManageAccess' => false,
                ],
            ]);
        }

        if ($link->expires_at !== null && $link->expires_at->isPast()) {
            return Inertia::render('Diagrams/SharedCanvas', [
                'status' => 'expired',
                'diagram' => null,
                'permissions' => [
                    'canView' => false,
                    'canEdit' => false,
                    'canManageAccess' => false,
                ],
            ]);
        }

        $diagram = $link->diagram()->with(['diagramTables.diagramColumns', 'diagramRelationships'])->firstOrFail();
        $user = $request->user();

        return Inertia::render('Diagrams/SharedCanvas', [
            'status' => 'active',
            'diagram' => [
                'id' => $diagram->id,
                'name' => $diagram->name,
                'owner_type' => $diagram->owner_type,
                'owner_id' => $diagram->owner_id,
                'viewport' => $diagram->viewport,
                'diagram_tables' => $diagram->diagramTables,
                'diagram_relationships' => $diagram->diagramRelationships,
            ],
            'permissions' => [
                'canView' => true,
                'canEdit' => $user ? $user->can('edit', $diagram) : false,
                'canManageAccess' => $user ? $user->can('manageAccess', $diagram) : false,
            ],
        ]);
    }
}
