<?php

use App\Http\Controllers\Api\DiagramController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/diagrams/{diagram}/preview', [DiagramController::class, 'uploadPreview'])
        ->middleware('auth');
});
