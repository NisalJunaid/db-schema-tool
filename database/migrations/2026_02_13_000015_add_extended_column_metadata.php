<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagram_columns', function (Blueprint $table): void {
            $table->json('enum_values')->nullable()->after('type');
            $table->unsignedInteger('length')->nullable()->after('enum_values');
            $table->unsignedInteger('precision')->nullable()->after('length');
            $table->unsignedInteger('scale')->nullable()->after('precision');
            $table->boolean('unsigned')->default(false)->after('scale');
            $table->boolean('auto_increment')->default(false)->after('unsigned');
            $table->string('collation')->nullable()->after('default');
            $table->string('index_type')->nullable()->after('collation');
            $table->string('on_delete')->nullable()->after('index_type');
            $table->string('on_update')->nullable()->after('on_delete');
        });
    }

    public function down(): void
    {
        Schema::table('diagram_columns', function (Blueprint $table): void {
            $table->dropColumn([
                'enum_values',
                'length',
                'precision',
                'scale',
                'unsigned',
                'auto_increment',
                'collation',
                'index_type',
                'on_delete',
                'on_update',
            ]);
        });
    }
};
