<?php

use App\Http\Controllers\Api\DiagramColumnController;
use App\Http\Controllers\Api\DiagramController;
use App\Http\Controllers\Api\DiagramRelationshipController;
use App\Http\Controllers\Api\DiagramTableController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::prefix('v1')->group(function () {
        Route::apiResource('diagrams', DiagramController::class);
        Route::apiResource('diagram-tables', DiagramTableController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-columns', DiagramColumnController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-relationships', DiagramRelationshipController::class)->only(['store', 'destroy']);
    });
});
