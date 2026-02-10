<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Api\DiagramColumnController;
use App\Http\Controllers\Api\DiagramController;
use App\Http\Controllers\Api\DiagramRelationshipController;
use App\Http\Controllers\Api\DiagramTableController;
use App\Http\Controllers\Api\TeamController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/diagrams', function () {
        return Inertia::render('Diagrams/Index');
    })->name('diagrams.index');

    Route::get('/diagrams/{diagram}', function (string $diagram) {
        return Inertia::render('Diagrams/Editor', [
            'diagramId' => $diagram,
        ]);
    })->name('diagrams.editor');

    Route::prefix('api/v1')->group(function () {
        Route::apiResource('diagrams', DiagramController::class);
        Route::get('teams', [TeamController::class, 'index']);
        Route::apiResource('diagram-tables', DiagramTableController::class)
            ->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-columns', DiagramColumnController::class)
            ->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-relationships', DiagramRelationshipController::class)
            ->only(['store', 'update', 'destroy']);
    });
});

require __DIR__.'/auth.php';
