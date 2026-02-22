<?php

use App\Http\Controllers\Api\DiagramController;
use App\Http\Controllers\Api\DiagramShareLinkController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth')->group(function () {
    Route::post('/diagrams/{diagram}/preview', [DiagramController::class, 'uploadPreview']);
    Route::get('/diagrams/{diagram}/share-links', [DiagramShareLinkController::class, 'index']);
    Route::post('/diagrams/{diagram}/share-links', [DiagramShareLinkController::class, 'store']);
    Route::post('/diagrams/{diagram}/share-links/{link}/revoke', [DiagramShareLinkController::class, 'revoke']);
});
