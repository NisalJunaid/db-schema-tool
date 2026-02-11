<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
            ],
        );

        $admin->update([
            'role' => 'super_admin',
            'permissions' => ['manage_teams', 'manage_users', 'manage_diagrams'],
        ]);
    }
}
