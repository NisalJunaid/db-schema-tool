<?php

namespace Tests\Feature\Api;

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeamControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_authenticated_users_teams_only(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $includedTeam = Team::create([
            'name' => 'Alpha Team',
            'owner_user_id' => $user->getKey(),
        ]);

        $excludedTeam = Team::create([
            'name' => 'Beta Team',
            'owner_user_id' => $otherUser->getKey(),
        ]);

        $includedTeam->users()->attach($user->getKey(), ['role' => 'viewer']);
        $excludedTeam->users()->attach($otherUser->getKey(), ['role' => 'owner']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/teams');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonFragment([
            'id' => $includedTeam->getKey(),
            'name' => $includedTeam->name,
            'owner_user_id' => $includedTeam->owner_user_id,
            'role' => 'viewer',
        ]);
        $response->assertJsonMissing([
            'id' => $excludedTeam->getKey(),
            'name' => $excludedTeam->name,
        ]);
    }

    public function test_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/teams');

        $response->assertUnauthorized();
    }
}
