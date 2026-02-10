<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('diagram_columns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('diagram_table_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type');
            $table->boolean('nullable')->default(false);
            $table->boolean('primary')->default(false);
            $table->boolean('unique')->default(false);
            $table->string('default')->nullable();
            $table->timestamps();

            $table->unique(['diagram_table_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diagram_columns');
    }
};
