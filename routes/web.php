<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\DiagramAccessController;
use App\Http\Controllers\Api\DiagramColumnController;
use App\Http\Controllers\Api\DiagramController;
use App\Http\Controllers\Api\DiagramRelationshipController;
use App\Http\Controllers\Api\DiagramTableController;
use App\Http\Controllers\Api\DiagramTransferController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\TeamMemberController;
use App\Http\Controllers\DashboardController;
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

    Route::get('/teams', function () {
        return Inertia::render('Teams/Index');
    })->name('teams.index');

    Route::get('/teams/{team}', function (string $team) {
        return Inertia::render('Teams/Show', ['teamId' => $team]);
    })->name('teams.show');

    Route::get('/admin/users', function () {
        abort_unless(auth()->user()?->hasAppRole(['admin', 'super_admin']), 403);

        return Inertia::render('Admin/Users/Index');
    })->name('admin.users.index');

    Route::prefix('api/v1')->group(function () {
        Route::apiResource('diagrams', DiagramController::class);
        Route::post('diagrams/{diagram}/import', [DiagramTransferController::class, 'import']);
        Route::get('diagrams/{diagram}/export-sql', [DiagramTransferController::class, 'exportSql']);
        Route::get('diagrams/{diagram}/export-migrations', [DiagramTransferController::class, 'exportMigrations']);

        Route::get('diagrams/{diagram}/access', [DiagramAccessController::class, 'index']);
        Route::post('diagrams/{diagram}/access', [DiagramAccessController::class, 'store']);
        Route::patch('diagrams/{diagram}/access/{access}', [DiagramAccessController::class, 'update']);
        Route::delete('diagrams/{diagram}/access/{access}', [DiagramAccessController::class, 'destroy']);
        Route::patch('diagrams/{diagram}/visibility', [DiagramAccessController::class, 'updateVisibility']);

        Route::get('teams', [TeamController::class, 'index']);
        Route::post('teams', [TeamController::class, 'store']);
        Route::get('teams/{team}', [TeamController::class, 'show']);
        Route::post('teams/{team}/members', [TeamMemberController::class, 'store']);
        Route::patch('teams/{team}/members/{user}', [TeamMemberController::class, 'update']);
        Route::delete('teams/{team}/members/{user}', [TeamMemberController::class, 'destroy']);

        Route::get('admin/users', [AdminUserController::class, 'index']);
        Route::patch('admin/users/{user}/role', [AdminUserController::class, 'updateRole']);
        Route::patch('admin/users/{user}/permissions', [AdminUserController::class, 'updatePermissions']);

        Route::apiResource('diagram-tables', DiagramTableController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-columns', DiagramColumnController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-relationships', DiagramRelationshipController::class)->only(['store', 'update', 'destroy']);
    });
});

require __DIR__.'/auth.php';
