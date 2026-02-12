<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagrams', function (Blueprint $table) {
            $table->string('editor_mode')->default('db')->after('viewport');
            $table->json('flow_state')->nullable()->after('editor_mode');
            $table->json('mind_state')->nullable()->after('flow_state');
        });
    }

    public function down(): void
    {
        Schema::table('diagrams', function (Blueprint $table) {
            $table->dropColumn(['editor_mode', 'flow_state', 'mind_state']);
        });
    }
};
