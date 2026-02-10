<?php

namespace Tests\Feature\Api;

use App\Models\Diagram;
use App\Models\DiagramColumn;
use App\Models\DiagramRelationship;
use App\Models\DiagramTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DiagramRelationshipControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_creates_relationship_when_columns_belong_to_same_diagram(): void
    {
        $user = User::factory()->create();
        $diagram = Diagram::create([
            'owner_type' => User::class,
            'owner_id' => $user->getKey(),
            'name' => 'Sales Diagram',
        ]);

        $fromColumn = $this->createColumnForDiagram($diagram, 'users', 'id');
        $toColumn = $this->createColumnForDiagram($diagram, 'orders', 'user_id');

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/diagram-relationships', [
            'diagram_id' => $diagram->getKey(),
            'from_column_id' => $fromColumn->getKey(),
            'to_column_id' => $toColumn->getKey(),
            'type' => 'one_to_many',
            'on_delete' => 'cascade',
            'on_update' => 'cascade',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('diagram_relationships', [
            'diagram_id' => $diagram->getKey(),
            'from_column_id' => $fromColumn->getKey(),
            'to_column_id' => $toColumn->getKey(),
            'type' => 'one_to_many',
        ]);
    }

    public function test_store_rejects_relationship_when_column_is_from_other_diagram(): void
    {
        $user = User::factory()->create();

        $diagram = Diagram::create([
            'owner_type' => User::class,
            'owner_id' => $user->getKey(),
            'name' => 'Main Diagram',
        ]);

        $otherDiagram = Diagram::create([
            'owner_type' => User::class,
            'owner_id' => $user->getKey(),
            'name' => 'Other Diagram',
        ]);

        $fromColumn = $this->createColumnForDiagram($diagram, 'users', 'id');
        $toColumn = $this->createColumnForDiagram($otherDiagram, 'orders', 'user_id');

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/diagram-relationships', [
            'diagram_id' => $diagram->getKey(),
            'from_column_id' => $fromColumn->getKey(),
            'to_column_id' => $toColumn->getKey(),
            'type' => 'one_to_many',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['from_column_id', 'to_column_id']);

        $this->assertDatabaseCount('diagram_relationships', 0);
    }

    public function test_destroy_requires_update_authorization_via_diagram_policy(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $diagram = Diagram::create([
            'owner_type' => User::class,
            'owner_id' => $owner->getKey(),
            'name' => 'Payments Diagram',
        ]);

        $fromColumn = $this->createColumnForDiagram($diagram, 'payments', 'id');
        $toColumn = $this->createColumnForDiagram($diagram, 'invoices', 'payment_id');

        $relationship = DiagramRelationship::create([
            'diagram_id' => $diagram->getKey(),
            'from_column_id' => $fromColumn->getKey(),
            'to_column_id' => $toColumn->getKey(),
            'type' => 'one_to_one',
        ]);

        Sanctum::actingAs($otherUser);

        $response = $this->deleteJson('/api/v1/diagram-relationships/'.$relationship->getKey());

        $response->assertForbidden();
        $this->assertDatabaseHas('diagram_relationships', ['id' => $relationship->getKey()]);
    }

    private function createColumnForDiagram(Diagram $diagram, string $tableName, string $columnName): DiagramColumn
    {
        $table = DiagramTable::create([
            'diagram_id' => $diagram->getKey(),
            'name' => $tableName,
            'x' => 0,
            'y' => 0,
            'w' => 220,
            'h' => 120,
        ]);

        return DiagramColumn::create([
            'diagram_table_id' => $table->getKey(),
            'name' => $columnName,
            'type' => 'bigint',
            'nullable' => false,
            'primary' => false,
            'unique' => false,
        ]);
    }
}
