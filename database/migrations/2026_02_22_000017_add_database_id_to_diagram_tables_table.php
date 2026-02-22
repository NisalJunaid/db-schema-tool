<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagram_tables', function (Blueprint $table) {
            $table->foreignId('database_id')
                ->nullable()
                ->after('diagram_id')
                ->constrained('diagram_databases')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('diagram_tables', function (Blueprint $table) {
            $table->dropConstrainedForeignId('database_id');
        });
    }
};
