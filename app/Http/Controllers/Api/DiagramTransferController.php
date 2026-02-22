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

        $type = $request->input('type');

        if ($type === 'sql') {
            $validated = $request->validate([
                'content' => ['required', 'string'],
            ]);

            $payload = $this->parseSqlImportPayload($validated['content']);
        } elseif ($type === 'json') {
            $validated = $request->validate([
                'content' => ['required', 'string'],
            ]);

            $decoded = json_decode($validated['content'], true);

            if (! is_array($decoded)) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => [
                        'content' => ['JSON content must be a valid object.'],
                    ],
                ], 422);
            }

            $payload = $this->normalizeJsonImportPayload($decoded);
        } else {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => [
                    'type' => ['Type must be sql or json.'],
                ],
            ], 422);
        }

        logger()->info('Diagram import parsed', [
            'diagram_id' => $diagram->id,
            'type' => $type,
            'tables' => count($payload['tables'] ?? []),
            'relationships' => count($payload['relationships'] ?? []),
        ]);

        DB::transaction(function () use ($diagram, $payload): void {
            $diagram->diagramRelationships()->delete();
            $diagram->diagramTables()->with('diagramColumns')->get()->each(function (DiagramTable $table): void {
                $table->diagramColumns()->delete();
                $table->delete();
            });

            $palette = ['#6366f1', '#0ea5e9', '#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e'];
            $createdTables = [];

            foreach ($payload['tables'] as $tableRow) {
                $table = DiagramTable::create([
                    'diagram_id' => $diagram->getKey(),
                    'name' => $tableRow['name'],
                    'schema' => $tableRow['schema'] ?? null,
                    'color' => $tableRow['color'] ?? null,
                    'x' => 0,
                    'y' => 0,
                    'w' => 320,
                    'h' => 200,
                ]);

                $createdTables[] = $table;
                foreach ($tableRow['columns'] ?? [] as $columnRow) {
                    $column = DiagramColumn::create([
                        'diagram_table_id' => $table->getKey(),
                        'name' => $columnRow['name'],
                        'type' => strtoupper((string) ($columnRow['type'] ?? 'VARCHAR')),
                        'enum_values' => $columnRow['enum_values'] ?? null,
                        'length' => $columnRow['length'] ?? null,
                        'precision' => $columnRow['precision'] ?? null,
                        'scale' => $columnRow['scale'] ?? null,
                        'unsigned' => (bool) ($columnRow['unsigned'] ?? false),
                        'auto_increment' => (bool) ($columnRow['auto_increment'] ?? false),
                        'nullable' => (bool) ($columnRow['nullable'] ?? false),
                        'primary' => (bool) ($columnRow['primary'] ?? false),
                        'unique' => (bool) ($columnRow['unique'] ?? false),
                        'default' => $columnRow['default'] ?? null,
                        'collation' => $columnRow['collation'] ?? null,
                        'index_type' => $columnRow['index_type'] ?? null,
                    ]);

                }
            }

            $columnsPerRow = (int) ceil(sqrt(max(count($createdTables), 1)));
            $spacingX = 450;
            $spacingY = 350;

            $row = 0;
            $col = 0;

            foreach ($createdTables as $index => $table) {
                $x = $col * $spacingX;
                $y = $row * $spacingY;

                $table->update([
                    'color' => $table->color ?: $palette[$index % count($palette)],
                    'x' => $x,
                    'y' => $y,
                    'w' => 320,
                    'h' => 200,
                ]);

                $col++;
                if ($col >= $columnsPerRow) {
                    $col = 0;
                    $row++;
                }
            }

            $foreignKeys = $payload['relationships'] ?? [];
            $columnLookup = [];
            foreach ($diagram->diagramTables()->with('diagramColumns')->get() as $table) {
                foreach ($table->diagramColumns as $column) {
                    $columnLookup[Str::lower($table->name).'.'.Str::lower($column->name)] = $column->getKey();
                }
            }

            foreach ($foreignKeys as $fk) {
                $fromKey = Str::lower(($fk['from_table'] ?? '')).'.'.Str::lower($fk['from_column'] ?? '');
                $toKey = Str::lower(($fk['to_table'] ?? '')).'.'.Str::lower($fk['to_column'] ?? '');

                if (! isset($columnLookup[$fromKey]) || ! isset($columnLookup[$toKey])) {
                    continue;
                }

                $fromColumnId = $columnLookup[$fromKey];
                $toColumnId = $columnLookup[$toKey];

                $fromColumn = DiagramColumn::query()->find($fromColumnId);

                $type = $fromColumn?->primary || $fromColumn?->unique
                    ? 'one_to_one'
                    : 'one_to_many';

                DiagramRelationship::create([
                    'diagram_id' => $diagram->getKey(),
                    'from_column_id' => $fromColumnId,
                    'to_column_id' => $toColumnId,
                    'type' => $type,
                    'on_delete' => $fk['on_delete'] ?? null,
                    'on_update' => $fk['on_update'] ?? null,
                ]);
            }

            $createdRelationshipCount = DiagramRelationship::where('diagram_id', $diagram->id)->count();

            logger()->info('Diagram import relationships saved', [
                'diagram_id' => $diagram->id,
                'relationships' => $createdRelationshipCount,
            ]);
        });

        return response()->json($diagram->fresh(['diagramTables.diagramColumns', 'diagramRelationships']));
    }

    private function normalizeJsonImportPayload(array $payload): array
    {
        validator($payload, [
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
            'foreignKeys' => ['nullable', 'array'],
            'foreignKeys.*.from_table' => ['required_with:foreignKeys', 'string', 'max:255'],
            'foreignKeys.*.from_column' => ['required_with:foreignKeys', 'string', 'max:255'],
            'foreignKeys.*.to_table' => ['required_with:foreignKeys', 'string', 'max:255'],
            'foreignKeys.*.to_column' => ['required_with:foreignKeys', 'string', 'max:255'],
            'relationships' => ['nullable', 'array'],
        ])->validate();

        $relationships = collect($payload['relationships'] ?? [])
            ->merge($payload['foreignKeys'] ?? [])
            ->map(fn (array $relationship) => [
                'from_table' => $relationship['from_table'] ?? null,
                'from_column' => $relationship['from_column'] ?? null,
                'to_table' => $relationship['to_table'] ?? null,
                'to_column' => $relationship['to_column'] ?? null,
                'on_delete' => $relationship['on_delete'] ?? null,
                'on_update' => $relationship['on_update'] ?? null,
            ])
            ->filter(fn (array $relationship) => $relationship['from_table'] && $relationship['from_column'] && $relationship['to_table'] && $relationship['to_column'])
            ->values()
            ->all();

        $payload['relationships'] = $relationships;

        return $payload;
    }

    private function parseSqlImportPayload(string $sql): array
    {
        $tables = [];
        $createRelationships = [];

        $tableIdentifierPattern = '((?:[`"]?[\w\-]+[`"]?\s*\.\s*)?[`"]?[\w\-]+[`"]?)';

        preg_match_all('/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?'.$tableIdentifierPattern.'\s*\((.*?)\)\s*(?:ENGINE|COMMENT|;|$)/is', $sql, $matches, PREG_SET_ORDER);

        foreach ($matches as $tableIndex => $tableMatch) {
            $tableName = $this->extractTableName($tableMatch[1]);
            $rows = $this->splitSqlDefinitions($tableMatch[2]);
            $columns = [];
            $tablePrimaryColumns = [];

            foreach ($rows as $row) {
                $row = trim(rtrim($row, ','));
                if ($row === '') continue;

                if (preg_match('/^PRIMARY\s+KEY\s*\((.+)\)$/i', $row, $pkMatch)) {
                    $tablePrimaryColumns = $this->parseColumnList($pkMatch[1]);
                    continue;
                }

                if (preg_match('/^(?:UNIQUE\s+(?:KEY|INDEX)|KEY|INDEX)\s+[`"]?\w*[`"]?\s*\((.+)\)/i', $row, $indexMatch)) {
                    $columnsInIndex = $this->parseColumnList($indexMatch[1]);
                    $isUnique = str_starts_with(strtoupper($row), 'UNIQUE');
                    foreach ($columns as &$column) {
                        if (in_array($column['name'], $columnsInIndex, true) && ! $column['primary']) {
                            $column['unique'] = $column['unique'] || $isUnique;
                            $column['index_type'] = $column['index_type'] ?? ($isUnique ? 'unique' : 'index');
                        }
                    }
                    continue;
                }

                if (preg_match('/^(?:CONSTRAINT\s+[`"]?\w+[`"]?\s+)?FOREIGN\s+KEY\s*\((.+?)\)\s+REFERENCES\s+[`"]?([\w.]+)[`"]?\s*\((.+?)\)(.*)$/i', $row, $fkMatch)) {
                    $fromColumns = $this->parseColumnList($fkMatch[1]);
                    $toTable = $this->extractTableName($fkMatch[2]);
                    $toColumns = $this->parseColumnList($fkMatch[3]);
                    [$onDelete, $onUpdate] = $this->extractFkRules($fkMatch[4] ?? '');

                    foreach ($fromColumns as $idx => $fromColumn) {
                        $createRelationships[] = [
                            'from_table' => $tableName,
                            'from_column' => $fromColumn,
                            'to_table' => $toTable,
                            'to_column' => $toColumns[$idx] ?? $toColumns[0] ?? null,
                            'on_delete' => $onDelete,
                            'on_update' => $onUpdate,
                        ];
                    }
                    continue;
                }

                $parsedColumn = $this->parseSqlColumnRow($row, $tableName, $createRelationships);
                if ($parsedColumn) $columns[] = $parsedColumn;
            }

            if ($tablePrimaryColumns) {
                foreach ($columns as &$column) {
                    if (in_array($column['name'], $tablePrimaryColumns, true)) {
                        $column['primary'] = true;
                        $column['index_type'] = 'primary';
                    }
                }
            }

            $tables[] = [
                'name' => $tableName,
                'columns' => $columns,
                'x' => 120 + $tableIndex * 40,
                'y' => 120 + $tableIndex * 40,
                'w' => 320,
                'h' => 240,
            ];
        }

        $alterRelationships = [];
        preg_match_all('/ALTER\s+TABLE\s+'.$tableIdentifierPattern.'\s+(.*?);/is', $sql, $alterStatements, PREG_SET_ORDER);

        foreach ($alterStatements as $statement) {
            $fromTable = $this->extractTableName($statement[1]);
            $alterBody = $statement[2] ?? '';

            preg_match_all('/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+'.$tableIdentifierPattern.'\s*\(([^)]+)\)(.*?)(?=,\s*(?:ADD\s+CONSTRAINT\s+[`"]?\w+[`"]?\s+)?FOREIGN\s+KEY|$)/is', $alterBody, $foreignKeyMatches, PREG_SET_ORDER);

            foreach ($foreignKeyMatches as $foreignKeyMatch) {
                $fromColumns = $this->parseColumnList($foreignKeyMatch[1]);
                $toTable = $this->extractTableName($foreignKeyMatch[2]);
                $toColumns = $this->parseColumnList($foreignKeyMatch[3]);
                [$onDelete, $onUpdate] = $this->extractFkRules($foreignKeyMatch[4] ?? '');

                foreach ($fromColumns as $index => $fromColumn) {
                    $alterRelationships[] = [
                        'from_table' => $fromTable,
                        'from_column' => $fromColumn,
                        'to_table' => $toTable,
                        'to_column' => $toColumns[$index] ?? $toColumns[0] ?? null,
                        'on_delete' => $onDelete,
                        'on_update' => $onUpdate,
                    ];
                }
            }
        }

        $relationships = collect($createRelationships)
            ->merge($alterRelationships)
            ->filter(fn ($relationship) => ! empty($relationship['from_table'])
                && ! empty($relationship['from_column'])
                && ! empty($relationship['to_table'])
                && ! empty($relationship['to_column']))
            ->map(function (array $relationship): array {
                $relationship['from_table'] = Str::lower($relationship['from_table']);
                $relationship['from_column'] = Str::lower($relationship['from_column']);
                $relationship['to_table'] = Str::lower($relationship['to_table']);
                $relationship['to_column'] = Str::lower($relationship['to_column']);

                return $relationship;
            })
            ->unique(fn ($relationship) => implode('|', [
                $relationship['from_table'],
                $relationship['from_column'],
                $relationship['to_table'],
                $relationship['to_column'],
            ]))
            ->values()
            ->all();

        return ['tables' => $tables, 'relationships' => $relationships];
    }

    private function parseSqlColumnRow(string $row, string $tableName, array &$relationships): ?array
    {
        if (! preg_match('/^[`"]?([\w]+)[`"]?\s+([A-Z]+(?:\s*\([^)]*\))?)(.*)$/i', $row, $matches)) {
            return null;
        }

        $name = $matches[1];
        $typeToken = strtoupper(trim($matches[2]));
        $rest = strtoupper(trim($matches[3] ?? ''));

        $type = preg_replace('/\(.*$/', '', $typeToken);
        $enumValues = null;
        $length = null;
        $precision = null;
        $scale = null;

        if (preg_match('/^ENUM\((.*)\)$/i', $typeToken, $enumMatch)) {
            $type = 'ENUM';
            $enumValues = collect($this->splitSqlDefinitions($enumMatch[1], ','))
                ->map(fn ($entry) => trim($entry, " '\""))
                ->filter(fn ($entry) => $entry !== '')
                ->values()
                ->all();
        }

        if (preg_match('/^VARCHAR\((\d+)\)$/i', $typeToken, $varcharMatch)) {
            $type = 'VARCHAR';
            $length = (int) $varcharMatch[1];
        }

        if (preg_match('/^DECIMAL\((\d+)\s*,\s*(\d+)\)$/i', $typeToken, $decimalMatch)) {
            $type = 'DECIMAL';
            $precision = (int) $decimalMatch[1];
            $scale = (int) $decimalMatch[2];
        }

        $default = null;
        if (preg_match('/DEFAULT\s+([^\s,]+)/i', $matches[3] ?? '', $defaultMatch)) {
            $default = trim($defaultMatch[1], "'\"");
        }

        $column = [
            'name' => $name,
            'type' => $type,
            'enum_values' => $enumValues,
            'length' => $length,
            'precision' => $precision,
            'scale' => $scale,
            'unsigned' => str_contains($rest, 'UNSIGNED'),
            'auto_increment' => str_contains($rest, 'AUTO_INCREMENT'),
            'nullable' => ! str_contains($rest, 'NOT NULL'),
            'primary' => str_contains($rest, 'PRIMARY KEY'),
            'unique' => str_contains($rest, 'UNIQUE'),
            'index_type' => str_contains($rest, 'PRIMARY KEY') ? 'primary' : (str_contains($rest, 'UNIQUE') ? 'unique' : null),
            'default' => $default,
        ];

        if (preg_match('/REFERENCES\s+((?:[`"]?[\w\-]+[`"]?\s*\.\s*)?[`"]?[\w\-]+[`"]?)\s*\(([^)]+)\)(.*)$/is', $matches[3] ?? '', $inlineFk)) {
            [$onDelete, $onUpdate] = $this->extractFkRules($inlineFk[3] ?? '');
            $relationships[] = [
                'from_table' => $tableName,
                'from_column' => $name,
                'to_table' => $this->extractTableName($inlineFk[1]),
                'to_column' => trim($inlineFk[2], "`\" "),
                'on_delete' => $onDelete,
                'on_update' => $onUpdate,
            ];
        }

        return $column;
    }

    private function splitSqlDefinitions(string $input, string $delimiter = ','): array
    {
        $parts = [];
        $buffer = '';
        $depth = 0;
        $inQuote = false;

        foreach (str_split($input) as $char) {
            if ($char === "'" && (strlen($buffer) === 0 || substr($buffer, -1) !== '\\')) {
                $inQuote = ! $inQuote;
            }

            if (! $inQuote) {
                if ($char === '(') $depth++;
                if ($char === ')') $depth--;
            }

            if ($char === $delimiter && $depth === 0 && ! $inQuote) {
                if (trim($buffer) !== '') $parts[] = trim($buffer);
                $buffer = '';
                continue;
            }

            $buffer .= $char;
        }

        if (trim($buffer) !== '') $parts[] = trim($buffer);

        return $parts;
    }

    private function parseColumnList(string $input): array
    {
        return collect(explode(',', $input))
            ->map(fn ($entry) => trim($entry, "`\" "))
            ->filter()
            ->values()
            ->all();
    }

    private function extractFkRules(string $suffix): array
    {
        $onDelete = null;
        $onUpdate = null;

        if (preg_match('/ON\s+DELETE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION|SET\s+DEFAULT)/i', $suffix, $deleteMatch)) {
            $onDelete = strtoupper($deleteMatch[1]);
        }

        if (preg_match('/ON\s+UPDATE\s+(RESTRICT|CASCADE|SET\s+NULL|NO\s+ACTION|SET\s+DEFAULT)/i', $suffix, $updateMatch)) {
            $onUpdate = strtoupper($updateMatch[1]);
        }

        return [$onDelete, $onUpdate];
    }

    private function extractTableName(string $reference): string
    {
        $normalizedReference = preg_replace('/\s*\.\s*/', '.', trim($reference));
        $normalizedReference = str_replace(['`', '"'], '', $normalizedReference);

        return Str::afterLast($normalizedReference, '.');
    }

    public function exportSql(Diagram $diagram): StreamedResponse
    {
        $this->authorize('view', $diagram);
        $diagram->load(['diagramTables.diagramColumns', 'diagramRelationships.fromColumn.diagramTable', 'diagramRelationships.toColumn.diagramTable']);

        $sql = collect($diagram->diagramTables)
            ->map(function (DiagramTable $table) use ($diagram): string {
                $columnSql = collect($table->diagramColumns)->map(function (DiagramColumn $column): string {
                    $parts = [sprintf('`%s` %s', $column->name, $this->columnTypeSql($column))];
                    $parts[] = $column->nullable ? 'NULL' : 'NOT NULL';
                    if ($column->auto_increment) $parts[] = 'AUTO_INCREMENT';
                    if ($column->default !== null) $parts[] = "DEFAULT '{$column->default}'";
                    if ($column->collation) $parts[] = "COLLATE {$column->collation}";
                    return implode(' ', $parts);
                })->values();

                $primaryColumns = collect($table->diagramColumns)->filter(fn (DiagramColumn $column) => $column->primary || $column->index_type === 'primary')->pluck('name');
                if ($primaryColumns->isNotEmpty()) {
                    $columnSql->push('PRIMARY KEY ('.collect($primaryColumns)->map(fn ($column) => "`{$column}`")->implode(', ').')');
                }

                collect($table->diagramColumns)->filter(fn (DiagramColumn $column) => $column->unique || $column->index_type === 'unique')->each(function (DiagramColumn $column) use ($columnSql): void {
                    $columnSql->push("UNIQUE KEY `{$column->name}_unique` (`{$column->name}`)");
                });

                $tableRelationships = collect($diagram->diagramRelationships)->filter(fn (DiagramRelationship $relationship) =>
                    $relationship->fromColumn?->diagramTable?->id === $table->id && $relationship->toColumn && $relationship->toColumn->diagramTable
                );

                $tableRelationships->each(function (DiagramRelationship $relationship, int $index) use ($columnSql): void {
                    $toTable = $relationship->toColumn->diagramTable->name;
                    $line = sprintf(
                        'CONSTRAINT `fk_%s_%d` FOREIGN KEY (`%s`) REFERENCES `%s` (`%s`)',
                        Str::snake($relationship->fromColumn->diagramTable->name),
                        $index,
                        $relationship->fromColumn->name,
                        $toTable,
                        $relationship->toColumn->name
                    );
                    if ($relationship->on_delete) $line .= " ON DELETE {$relationship->on_delete}";
                    if ($relationship->on_update) $line .= " ON UPDATE {$relationship->on_update}";
                    $columnSql->push($line);
                });

                return "CREATE TABLE `{$table->name}` (\n    ".$columnSql->implode(",\n    ")."\n);";
            })
            ->implode("\n\n");

        return response()->streamDownload(fn () => print $sql, 'schema.sql', ['Content-Type' => 'text/sql']);
    }

    private function columnTypeSql(DiagramColumn $column): string
    {
        $type = strtoupper($column->type);

        if ($type === 'ENUM') {
            $values = collect($column->enum_values ?? [])->map(fn ($value) => "'".str_replace("'", "''", (string) $value)."'")->implode(',');
            return "ENUM({$values})";
        }

        if ($type === 'VARCHAR' && $column->length) {
            return "VARCHAR({$column->length})";
        }

        if ($type === 'DECIMAL' && $column->precision && $column->scale !== null) {
            return "DECIMAL({$column->precision},{$column->scale})";
        }

        if ($column->unsigned && in_array($type, ['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT'], true)) {
            return "{$type} UNSIGNED";
        }

        return $type;
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
        $lines = ["<?php", '', 'use Illuminate\\Database\\Migrations\\Migration;', 'use Illuminate\\Database\\Schema\\Blueprint;', 'use Illuminate\\Support\\Facades\\Schema;', '', 'return new class extends Migration', '{', '    public function up(): void', '    {', "        Schema::create('{$table->name}', function (Blueprint \\$table) {"];

        foreach ($table->diagramColumns as $column) {
            $line = "            \\$table->{$this->toBlueprintMethod($column)}";
            if ($column->unsigned) $line .= '->unsigned()';
            if ($column->nullable) $line .= '->nullable()';
            if ($column->unique || $column->index_type === 'unique') $line .= '->unique()';
            if ($column->auto_increment) $line .= '->autoIncrement()';
            if ($column->default !== null) $line .= "->default('".addslashes($column->default)."')";
            $line .= ';';
            $lines[] = $line;
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
        if ($type === 'varchar') return "string('{$column->name}', ".($column->length ?? 255).")";
        if ($type === 'bigint') return "bigInteger('{$column->name}')";
        if ($type === 'int') return "integer('{$column->name}')";
        if ($type === 'boolean' || $type === 'bool') return "boolean('{$column->name}')";
        if (in_array($type, ['text', 'mediumtext', 'longtext', 'tinytext'], true)) return "{$type}('{$column->name}')";
        if ($type === 'decimal') return "decimal('{$column->name}', ".($column->precision ?? 10).', '.($column->scale ?? 2).")";
        if ($type === 'date') return "date('{$column->name}')";
        if ($type === 'timestamp') return "timestamp('{$column->name}')";
        if ($type === 'json') return "json('{$column->name}')";
        if ($type === 'enum') {
            $vals = implode(', ', collect($column->enum_values ?? [])->map(fn ($v) => "'".addslashes((string) $v)."'")->all());
            return "enum('{$column->name}', [{$vals}])";
        }
        return "string('{$column->name}')";
    }
}
