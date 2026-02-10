<?php

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
});

require __DIR__.'/auth.php';
