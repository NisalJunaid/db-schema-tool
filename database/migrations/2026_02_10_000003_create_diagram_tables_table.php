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
        Schema::create('diagram_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('diagram_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('schema')->nullable();
            $table->integer('x');
            $table->integer('y');
            $table->integer('w');
            $table->integer('h');
            $table->timestamps();

            $table->unique(['diagram_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diagram_tables');
    }
};
