<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diagram;
use App\Models\DiagramColumn;
use App\Models\DiagramRelationship;
use App\Models\DiagramTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DiagramTransferController extends Controller
{
    public function import(Request $request, Diagram $diagram): JsonResponse
    {
        $this->authorize('update', $diagram);

        $validated = $request->validate([
            'tables' => ['required', 'array'],
            'tables.*.name' => ['required', 'string', 'max:255'],
            'tables.*.schema' => ['nullable', 'string', 'max:255'],
            'tables.*.color' => ['nullable', 'string', 'max:32'],
            'tables.*.x' => ['nullable', 'numeric'],
            'tables.*.y' => ['nullable', 'numeric'],
            'tables.*.w' => ['nullable', 'numeric'],
            'tables.*.h' => ['nullable', 'numeric'],
            'tables.*.columns' => ['nullable', 'array'],
            'tables.*.columns.*.name' => ['required', 'string', 'max:255'],
            'tables.*.columns.*.type' => ['required', 'string', 'max:255'],
            'tables.*.columns.*.nullable' => ['nullable', 'boolean'],
            'tables.*.columns.*.primary' => ['nullable', 'boolean'],
            'tables.*.columns.*.unique' => ['nullable', 'boolean'],
            'tables.*.columns.*.default' => ['nullable', 'string', 'max:255'],
            'relationships' => ['nullable', 'array'],
        ]);

        DB::transaction(function () use ($diagram, $validated): void {
            $diagram->diagramRelationships()->delete();
            $diagram->diagramTables()->with('diagramColumns')->get()->each(function (DiagramTable $table) {
                $table->diagramColumns()->delete();
                $table->delete();
            });

            $columnMap = [];

            foreach ($validated['tables'] as $index => $tableRow) {
                $table = DiagramTable::create([
                    'diagram_id' => $diagram->getKey(),
                    'name' => $tableRow['name'],
                    'schema' => $tableRow['schema'] ?? null,
                    'color' => $tableRow['color'] ?? null,
                    'x' => (int) ($tableRow['x'] ?? 120 + ($index * 50)),
                    'y' => (int) ($tableRow['y'] ?? 120 + ($index * 40)),
                    'w' => (int) ($tableRow['w'] ?? 320),
                    'h' => (int) ($tableRow['h'] ?? 240),
                ]);

                foreach ($tableRow['columns'] ?? [] as $columnRow) {
                    $column = DiagramColumn::create([
                        'diagram_table_id' => $table->getKey(),
                        'name' => $columnRow['name'],
                        'type' => $columnRow['type'],
                        'nullable' => (bool) ($columnRow['nullable'] ?? false),
                        'primary' => (bool) ($columnRow['primary'] ?? false),
                        'unique' => (bool) ($columnRow['unique'] ?? false),
                        'default' => $columnRow['default'] ?? null,
                    ]);

                    $mapKey = Str::lower($table->name.'.'.$column->name);
                    $columnMap[$mapKey] = $column->getKey();
                }
            }

            foreach ($validated['relationships'] ?? [] as $relationshipRow) {
                $fromColumnId = $columnMap[Str::lower(($relationshipRow['from_table'] ?? '').'.'.($relationshipRow['from_column'] ?? ''))] ?? null;
                $toColumnId = $columnMap[Str::lower(($relationshipRow['to_table'] ?? '').'.'.($relationshipRow['to_column'] ?? ''))] ?? null;

                if (! $fromColumnId || ! $toColumnId) {
                    continue;
                }

                DiagramRelationship::create([
                    'diagram_id' => $diagram->getKey(),
                    'from_column_id' => $fromColumnId,
                    'to_column_id' => $toColumnId,
                    'type' => $relationshipRow['type'] ?? 'one_to_many',
                    'on_delete' => $relationshipRow['on_delete'] ?? null,
                    'on_update' => $relationshipRow['on_update'] ?? null,
                ]);
            }
        });

        return response()->json($diagram->fresh(['diagramTables.diagramColumns', 'diagramRelationships']));
    }

    public function exportSql(Diagram $diagram): StreamedResponse
    {
        $this->authorize('view', $diagram);
        $diagram->load('diagramTables.diagramColumns');

        $sql = collect($diagram->diagramTables)
            ->map(function (DiagramTable $table): string {
                $columnSql = collect($table->diagramColumns)->map(function (DiagramColumn $column): string {
                    $parts = [sprintf('`%s` %s', $column->name, $column->type)];
                    if (! $column->nullable) {
                        $parts[] = 'NOT NULL';
                    }
                    if ($column->unique) {
                        $parts[] = 'UNIQUE';
                    }
                    if ($column->default !== null) {
                        $parts[] = "DEFAULT '{$column->default}'";
                    }

                    return implode(' ', $parts);
                })->values();

                $primaryColumns = collect($table->diagramColumns)->filter(fn (DiagramColumn $column) => $column->primary)->pluck('name');
                if ($primaryColumns->isNotEmpty()) {
                    $columnSql->push('PRIMARY KEY ('.collect($primaryColumns)->map(fn ($column) => "`{$column}`")->implode(', ').')');
                }

                return "CREATE TABLE `{$table->name}` (\n    ".$columnSql->implode(",\n    ")."\n);";
            })
            ->implode("\n\n");

        return response()->streamDownload(fn () => print $sql, 'schema.sql', ['Content-Type' => 'text/sql']);
    }

    public function exportMigrations(Diagram $diagram): StreamedResponse
    {
        $this->authorize('view', $diagram);
        $diagram->load('diagramTables.diagramColumns');

        $content = "<?php\n\nuse Illuminate\\Database\\Migrations\\Migration;\nuse Illuminate\\Database\\Schema\\Blueprint;\nuse Illuminate\\Support\\Facades\\Schema;\n\n";

        foreach ($diagram->diagramTables as $table) {
            $class = 'Create'.Str::studly($table->name).'Table';
            $content .= "return new class extends Migration {\n    public function up(): void\n    {\n        Schema::create('{$table->name}', function (Blueprint \\$table) {\n";
            foreach ($table->diagramColumns as $column) {
                $type = Str::lower($column->type);
                $method = str_contains($type, 'int') ? 'integer' : (str_contains($type, 'text') ? 'text' : 'string');
                $line = "            \\$table->{$method}('{$column->name}')";
                if ($column->nullable) {
                    $line .= '->nullable()';
                }
                if ($column->unique) {
                    $line .= '->unique()';
                }
                $line .= ';';
                $content .= $line."\n";
            }

            $primaryColumns = collect($table->diagramColumns)->filter(fn (DiagramColumn $column) => $column->primary)->pluck('name')->values();
            if ($primaryColumns->isNotEmpty()) {
                $content .= "            \\$table->primary(['".$primaryColumns->implode("','")."']);\n";
            }

            $content .= "        });\n    }\n\n    public function down(): void\n    {\n        Schema::dropIfExists('{$table->name}');\n    }\n};\n\n";
            $content .= "// {$class}\n\n";
        }

        return response()->streamDownload(fn () => print $content, 'migrations.php', ['Content-Type' => 'text/x-php']);
    }
}
