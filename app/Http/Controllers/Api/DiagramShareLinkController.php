<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagram;
use App\Models\DiagramShareLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DiagramShareLinkController extends Controller
{
    public function index(Diagram $diagram): JsonResponse
    {
        $this->authorize('manageAccess', $diagram);

        $links = $diagram->shareLinks()
            ->latest()
            ->get()
            ->map(fn (DiagramShareLink $link) => [
                'id' => $link->id,
                'name' => $link->name,
                'expires_at' => $link->expires_at,
                'revoked_at' => $link->revoked_at,
                'created_at' => $link->created_at,
                'is_active' => $link->isActive(),
            ])
            ->values();

        return response()->json($links);
    }

    public function store(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('manageAccess', $diagram);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'expires_in_value' => ['nullable', 'integer', 'min:1', 'max:525600'],
            'expires_at' => ['nullable', 'date'],
            'permanent' => ['nullable', 'boolean'],
        ]);

        $token = Str::random(48);
        $permanent = (bool) ($validated['permanent'] ?? false);

        $expiresAt = null;
        if (! $permanent) {
            if (! empty($validated['expires_at'])) {
                $expiresAt = now()->parse($validated['expires_at']);
            } elseif (! empty($validated['expires_in_value'])) {
                $expiresAt = now()->addMinutes((int) $validated['expires_in_value']);
            } else {
                $expiresAt = now()->addDays(7);
            }
        }

        $link = DiagramShareLink::query()->create([
            'diagram_id' => $diagram->getKey(),
            'created_by' => $request->user()->getKey(),
            'token_hash' => hash('sha256', $token),
            'name' => $validated['name'] ?? null,
            'can_view' => true,
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'id' => $link->id,
            'token' => $token,
            'url' => route('diagrams.share.view', ['token' => $token]),
            'expires_at' => $link->expires_at,
        ], 201);
    }

    public function revoke(Diagram $diagram, DiagramShareLink $link): JsonResponse
    {
        $this->authorize('manageAccess', $diagram);

        abort_unless((int) $link->diagram_id === (int) $diagram->getKey(), 404);

        $link->forceFill(['revoked_at' => now()])->save();

        return response()->json(['ok' => true]);
    }
}
