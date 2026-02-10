<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teams = $request->user()
            ->teams()
            ->select('teams.id', 'teams.name', 'teams.owner_user_id', 'team_user.role')
            ->orderBy('teams.name')
            ->get();

        return response()->json($teams);
    }
}
