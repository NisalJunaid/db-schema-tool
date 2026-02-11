<?php

namespace Tests\Feature\Api;

use App\Models\Diagram;
use App\Models\DiagramAccess;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DiagramPermissionsAndInvitationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_team_editor_can_edit_team_diagram_via_table_store_endpoint(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();

        $team = Team::create([
            'name' => 'Product Team',
            'owner_user_id' => $owner->getKey(),
        ]);

        $team->users()->attach($owner->getKey(), ['role' => 'admin']);
        $team->users()->attach($editor->getKey(), ['role' => 'editor']);

        $diagram = Diagram::create([
            'owner_type' => 'team',
            'owner_id' => $team->getKey(),
            'name' => 'Catalog Diagram',
        ]);

        Sanctum::actingAs($editor);

        $response = $this->postJson('/api/v1/diagram-tables', [
            'diagram_id' => $diagram->getKey(),
            'name' => 'products',
            'x' => 10,
            'y' => 10,
            'w' => 220,
            'h' => 140,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('diagram_tables', [
            'diagram_id' => $diagram->getKey(),
            'name' => 'products',
        ]);
    }

    public function test_diagram_index_includes_team_owned_diagrams_shared_directly_to_user(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create();

        $team = Team::create([
            'name' => 'Infra Team',
            'owner_user_id' => $owner->getKey(),
        ]);

        $team->users()->attach($owner->getKey(), ['role' => 'admin']);

        $diagram = Diagram::create([
            'owner_type' => 'team',
            'owner_id' => $team->getKey(),
            'name' => 'Network Topology',
        ]);

        DiagramAccess::create([
            'diagram_id' => $diagram->getKey(),
            'subject_type' => 'user',
            'subject_id' => $invitee->getKey(),
            'role' => 'viewer',
        ]);

        Sanctum::actingAs($invitee);

        $response = $this->getJson('/api/v1/diagrams');

        $response->assertOk();
        $response->assertJsonFragment([
            'id' => $diagram->getKey(),
            'owner_type' => 'team',
            'is_directly_shared' => true,
        ]);
    }

    public function test_accepting_team_invitation_upgrades_membership_and_does_not_downgrade(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create();

        $team = Team::create([
            'name' => 'Data Team',
            'owner_user_id' => $owner->getKey(),
        ]);

        $team->users()->attach($owner->getKey(), ['role' => 'admin']);
        $team->users()->attach($invitee->getKey(), ['role' => 'viewer']);

        $upgradeInvitation = Invitation::create([
            'email' => $invitee->email,
            'inviter_user_id' => $owner->getKey(),
            'type' => 'team',
            'team_id' => $team->getKey(),
            'role' => 'editor',
        ]);

        Sanctum::actingAs($invitee);

        $this->postJson('/api/v1/invitations/'.$upgradeInvitation->getKey().'/accept')->assertOk();

        $this->assertDatabaseHas('team_user', [
            'team_id' => $team->getKey(),
            'user_id' => $invitee->getKey(),
            'role' => 'editor',
        ]);

        $team->users()->updateExistingPivot($invitee->getKey(), ['role' => 'admin']);

        $downgradeInvitation = Invitation::create([
            'email' => $invitee->email,
            'inviter_user_id' => $owner->getKey(),
            'type' => 'team',
            'team_id' => $team->getKey(),
            'role' => 'viewer',
        ]);

        $this->postJson('/api/v1/invitations/'.$downgradeInvitation->getKey().'/accept')->assertOk();

        $this->assertDatabaseHas('team_user', [
            'team_id' => $team->getKey(),
            'user_id' => $invitee->getKey(),
            'role' => 'admin',
        ]);
    }

    public function test_accepting_diagram_invitation_returns_diagram_payload_and_creates_access(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create();

        $team = Team::create([
            'name' => 'Platform Team',
            'owner_user_id' => $owner->getKey(),
        ]);

        $team->users()->attach($owner->getKey(), ['role' => 'admin']);

        $diagram = Diagram::create([
            'owner_type' => 'team',
            'owner_id' => $team->getKey(),
            'name' => 'Billing',
            'preview_path' => 'diagram-previews/123.png',
        ]);

        $invitation = Invitation::create([
            'email' => $invitee->email,
            'inviter_user_id' => $owner->getKey(),
            'type' => 'diagram',
            'team_id' => $team->getKey(),
            'diagram_id' => $diagram->getKey(),
            'role' => 'editor',
        ]);

        Sanctum::actingAs($invitee);

        $response = $this->postJson('/api/v1/invitations/'.$invitation->getKey().'/accept');

        $response->assertOk();
        $response->assertJsonPath('diagram.id', $diagram->getKey());
        $response->assertJsonPath('diagram.preview_url', asset('storage/diagram-previews/123.png'));
        $response->assertJsonPath('diagram.permissions.canEdit', true);

        $this->assertDatabaseHas('diagram_access', [
            'diagram_id' => $diagram->getKey(),
            'subject_type' => 'user',
            'subject_id' => $invitee->getKey(),
            'role' => 'editor',
        ]);
    }
}
