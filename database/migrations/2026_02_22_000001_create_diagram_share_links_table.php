<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagram_share_links', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('diagram_id')->constrained('diagrams')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('name')->nullable();
            $table->boolean('can_view')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagram_share_links');
    }
};
