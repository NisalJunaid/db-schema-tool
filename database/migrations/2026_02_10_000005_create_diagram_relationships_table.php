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
        Schema::create('diagram_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('diagram_id')->constrained()->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('from_column_id')->constrained('diagram_columns')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('to_column_id')->constrained('diagram_columns')->cascadeOnUpdate()->cascadeOnDelete();
            $table->enum('type', ['one_to_one', 'one_to_many', 'many_to_many']);
            $table->string('on_delete')->nullable();
            $table->string('on_update')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diagram_relationships');
    }
};
