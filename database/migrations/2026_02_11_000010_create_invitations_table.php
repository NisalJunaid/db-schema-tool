<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->foreignId('inviter_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('diagram_id')->nullable()->constrained('diagrams')->nullOnDelete();
            $table->string('role');
            $table->string('token')->unique();
            $table->string('status')->default('pending');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['email', 'status']);
            $table->index(['type', 'team_id']);
            $table->index(['type', 'diagram_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
