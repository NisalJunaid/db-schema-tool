<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\DiagramAccessController;
use App\Http\Controllers\Api\DiagramColumnController;
use App\Http\Controllers\Api\DiagramDatabaseController;
use App\Http\Controllers\Api\DiagramController;
use App\Http\Controllers\Api\DiagramRelationshipController;
use App\Http\Controllers\Api\DiagramShareLinkController;
use App\Http\Controllers\Api\DiagramTableController;
use App\Http\Controllers\Api\DiagramTransferController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\TeamMemberController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiagramShareViewController;
use App\Models\Diagram;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Welcome');
})->name('home');

Route::get('/invitations/accept/{token}', [InvitationController::class, 'accept'])->name('invitations.accept');
Route::get('/s/{token}', [DiagramShareViewController::class, 'show'])->name('diagrams.share.view');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/diagrams', fn () => Inertia::render('Diagrams/Index'))->name('diagrams.index');

    Route::get('/diagrams/{diagram}', function (Diagram $diagram) {
        Gate::authorize('view', $diagram);

        return Inertia::render('Diagrams/Editor', [
            'diagramId' => (string) $diagram->getKey(),
            'permissions' => [
                'canView' => auth()->user()->can('view', $diagram),
                'canEdit' => auth()->user()->can('edit', $diagram),
                'canManageAccess' => auth()->user()->can('manageAccess', $diagram),
                'canDelete' => auth()->user()->can('delete', $diagram),
            ],
        ]);
    })->name('diagrams.editor');

    Route::get('/teams', fn () => Inertia::render('Teams/Index'))->name('teams.index');
    Route::get('/invitations', fn () => Inertia::render('Invitations/Index'))->name('invitations.index');

    Route::get('/teams/{team}', fn (string $team) => Inertia::render('Teams/Show', ['teamId' => $team]))->name('teams.show');

    Route::get('/admin/users', function () {
        abort_unless(auth()->user()?->hasAppRole(['admin', 'super_admin']), 403);

        return Inertia::render('Admin/Users/Index');
    })->name('admin.users.index');

    Route::prefix('api/v1')->group(function () {
        Route::apiResource('diagrams', DiagramController::class);
        Route::post('diagrams/{diagram}/invite', [DiagramController::class, 'invite']);
        Route::post('diagrams/{diagram}/import', [DiagramTransferController::class, 'import']);
        Route::delete('diagrams/{diagram}/clear', [DiagramController::class, 'clear']);
        Route::get('diagrams/{diagram}/export-sql', [DiagramTransferController::class, 'exportSql']);
        Route::get('diagrams/{diagram}/export-migrations', [DiagramTransferController::class, 'exportMigrations']);

        Route::get('diagrams/{diagram}/access', [DiagramAccessController::class, 'index']);
        Route::post('diagrams/{diagram}/preview', [DiagramController::class, 'uploadPreview']);
        Route::post('diagrams/{diagram}/access', [DiagramAccessController::class, 'store']);
        Route::patch('diagrams/{diagram}/access/{access}', [DiagramAccessController::class, 'update']);
        Route::delete('diagrams/{diagram}/access/{access}', [DiagramAccessController::class, 'destroy']);
        Route::patch('diagrams/{diagram}/visibility', [DiagramAccessController::class, 'updateVisibility']);
        Route::get('diagrams/{diagram}/share-links', [DiagramShareLinkController::class, 'index']);
        Route::post('diagrams/{diagram}/share-links', [DiagramShareLinkController::class, 'store']);
        Route::post('diagrams/{diagram}/share-links/{link}/revoke', [DiagramShareLinkController::class, 'revoke']);

        Route::get('teams', [TeamController::class, 'index']);
        Route::post('teams', [TeamController::class, 'store']);
        Route::get('teams/{team}', [TeamController::class, 'show']);
        Route::post('teams/{team}/invite', [TeamController::class, 'invite']);
        Route::post('teams/{team}/members', [TeamMemberController::class, 'store']);
        Route::patch('teams/{team}/members/{user}', [TeamMemberController::class, 'update']);
        Route::delete('teams/{team}/members/{user}', [TeamMemberController::class, 'destroy']);

        Route::get('admin/users', [AdminUserController::class, 'index']);
        Route::patch('admin/users/{user}/role', [AdminUserController::class, 'updateRole']);
        Route::patch('admin/users/{user}/permissions', [AdminUserController::class, 'updatePermissions']);
        Route::get('invitations', [InvitationController::class, 'index']);
        Route::post('invitations/{invitation}/accept', [InvitationController::class, 'acceptInApp']);
        Route::post('invitations/{invitation}/decline', [InvitationController::class, 'declineInApp']);

        Route::get('admin/invitations', [InvitationController::class, 'adminIndex']);
        Route::post('admin/invitations/{invitation}/resend', [InvitationController::class, 'resend']);

        Route::apiResource('diagram-databases', DiagramDatabaseController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-tables', DiagramTableController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-columns', DiagramColumnController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('diagram-relationships', DiagramRelationshipController::class)->only(['store', 'update', 'destroy']);
    });
});

require __DIR__.'/auth.php';
