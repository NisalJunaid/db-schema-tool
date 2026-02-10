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
use ZipArchive;

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

    public function exportMigrations(Diagram $diagram)
    {
        $this->authorize('view', $diagram);
        $diagram->load('diagramTables.diagramColumns');

        $zipPath = tempnam(sys_get_temp_dir(), 'diagram_migrations_');
        $zip = new ZipArchive;
        $opened = $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        if ($opened !== true) {
            abort(500, 'Unable to generate migration archive.');
        }

        $baseTimestamp = now();

        foreach ($diagram->diagramTables->values() as $index => $table) {
            $timestamp = $baseTimestamp->copy()->addSeconds($index)->format('Y_m_d_His');
            $fileName = sprintf('migrations/%s_create_%s_table.php', $timestamp, Str::snake($table->name));

            $zip->addFromString($fileName, $this->buildMigrationContent($table));
        }

        $zip->close();

        return response()->download($zipPath, 'migrations.zip', ['Content-Type' => 'application/zip'])->deleteFileAfterSend(true);
    }

    private function buildMigrationContent(DiagramTable $table): string
    {
        $lines = [
            "<?php",
            '',
            'use Illuminate\\Database\\Migrations\\Migration;',
            'use Illuminate\\Database\\Schema\\Blueprint;',
            'use Illuminate\\Support\\Facades\\Schema;',
            '',
            'return new class extends Migration',
            '{',
            '    public function up(): void',
            '    {',
            "        Schema::create('{$table->name}', function (Blueprint \\$table) {",
        ];

        $hasTimestamps = collect($table->diagramColumns)->contains(fn (DiagramColumn $column) => in_array(Str::lower($column->name), ['created_at', 'updated_at'], true));

        foreach ($table->diagramColumns as $column) {
            $columnName = Str::lower($column->name);
            if ($hasTimestamps && in_array($columnName, ['created_at', 'updated_at'], true)) {
                continue;
            }

            $methodCall = $this->toBlueprintMethod($column);
            $line = "            \\$table->{$methodCall}";

            if ($column->nullable) {
                $line .= '->nullable()';
            }

            if ($column->unique) {
                $line .= '->unique()';
            }

            if ($column->default !== null) {
                $line .= "->default('".addslashes($column->default)."')";
            }

            $line .= ';';
            $lines[] = $line;
        }

        if ($hasTimestamps) {
            $lines[] = '            $table->timestamps();';
        }

        $primaryColumns = collect($table->diagramColumns)
            ->filter(fn (DiagramColumn $column) => $column->primary)
            ->pluck('name')
            ->values();

        if ($primaryColumns->isNotEmpty()) {
            $lines[] = "            \\$table->primary(['".$primaryColumns->implode("', '")."']);";
        }

        $lines[] = '        });';
        $lines[] = '    }';
        $lines[] = '';
        $lines[] = '    public function down(): void';
        $lines[] = '    {';
        $lines[] = "        Schema::dropIfExists('{$table->name}');";
        $lines[] = '    }';
        $lines[] = '};';
        $lines[] = '';

        return implode("\n", $lines);
    }

    private function toBlueprintMethod(DiagramColumn $column): string
    {
        $type = Str::lower($column->type);

        if (preg_match('/^varchar\((\d+)\)$/', $type, $matches)) {
            return "string('{$column->name}', {$matches[1]})";
        }

        if (str_starts_with($type, 'bigint')) {
            return "bigInteger('{$column->name}')";
        }

        if (str_starts_with($type, 'int')) {
            return "integer('{$column->name}')";
        }

        if (str_starts_with($type, 'boolean') || $type === 'bool') {
            return "boolean('{$column->name}')";
        }

        if (str_starts_with($type, 'text')) {
            return "text('{$column->name}')";
        }

        if (preg_match('/^decimal\((\d+)\s*,\s*(\d+)\)$/', $type, $matches)) {
            return "decimal('{$column->name}', {$matches[1]}, {$matches[2]})";
        }

        if ($type === 'date') {
            return "date('{$column->name}')";
        }

        if (str_starts_with($type, 'timestamp')) {
            return "timestamp('{$column->name}')";
        }

        return "string('{$column->name}')";
    }
}
