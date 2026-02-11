<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            margin: 0;
            padding: 16px;
            background: #f8fafc;
            font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #0f172a;
        }

        .diagram-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
        }

        .table {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px;
            margin-bottom: 12px;
            background: #ffffff;
            box-shadow: 0 1px 1px rgba(15, 23, 42, 0.05);
        }

        .table-header {
            font-weight: 700;
            margin-bottom: 6px;
            font-size: 14px;
        }

        .column {
            font-size: 12px;
            color: #334155;
            margin: 2px 0;
        }

        .empty-state {
            font-size: 12px;
            color: #64748b;
        }
    </style>
</head>
<body>
<div class="diagram-title">{{ $diagram->name }}</div>

@if($diagram->diagramTables->isEmpty())
    <div class="empty-state">No tables in this diagram yet.</div>
@else
    @foreach($diagram->diagramTables as $table)
        <div class="table">
            <div class="table-header">{{ $table->name }}</div>

            @forelse($table->diagramColumns as $column)
                <div class="column">{{ $column->name }} ({{ $column->type }})</div>
            @empty
                <div class="empty-state">No columns yet.</div>
            @endforelse
        </div>
    @endforeach
@endif
</body>
</html>
