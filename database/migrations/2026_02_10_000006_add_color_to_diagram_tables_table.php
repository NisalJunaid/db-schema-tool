<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagram_tables', function (Blueprint $table): void {
            $table->string('color')->nullable()->after('schema');
        });
    }

    public function down(): void
    {
        Schema::table('diagram_tables', function (Blueprint $table): void {
            $table->dropColumn('color');
        });
    }
};
