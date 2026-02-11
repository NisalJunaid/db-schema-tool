<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->string('email_status')->default('pending')->after('status');
            $table->text('email_last_error')->nullable()->after('email_status');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropIndex(['email']);
            $table->dropColumn(['email_status', 'email_last_error']);
        });
    }
};
