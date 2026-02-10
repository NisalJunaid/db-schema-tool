import { memo, useMemo } from 'react';
import { Handle, Position } from 'reactflow';

function TableNode({ id, data }) {
    const tableName = data?.name ?? '';
    const columns = Array.isArray(data?.columns) ? data.columns : [];

    const sortedColumns = useMemo(
        () => [...columns].sort((a, b) => String(a.id).localeCompare(String(b.id))),
        [columns]
    );

    const onTableNameChange = (event) => {
        data?.onTableNameChange?.({ nodeId: id, tableId: data?.tableId, name: event.target.value });
    };

    const onAddColumn = () => {
        data?.onAddColumn?.({ nodeId: id, tableId: data?.tableId });
    };

    const onRemoveColumn = (columnId) => {
        data?.onRemoveColumn?.({
            nodeId: id,
            tableId: data?.tableId,
            columnId,
        });
    };

    return (
        <div className="min-w-[280px] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-md">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                <input
                    type="text"
                    value={tableName}
                    onChange={onTableNameChange}
                    placeholder="Table name"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
            </div>

            <ul className="max-h-64 overflow-y-auto">
                {sortedColumns.map((column) => (
                    <li
                        key={column.id}
                        className="relative flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-700"
                    >
                        <Handle
                            id={String(column.id)}
                            type="target"
                            position={Position.Left}
                            className="!h-2.5 !w-2.5 !border !border-slate-500 !bg-white"
                        />

                        <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
                            <span className="truncate font-medium text-slate-900">{column.name}</span>
                            <span className="shrink-0 text-slate-500">{column.type ?? 'string'}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => onRemoveColumn(column.id)}
                            className="shrink-0 rounded px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
                        >
                            Remove
                        </button>

                        <Handle
                            id={String(column.id)}
                            type="source"
                            position={Position.Right}
                            className="!h-2.5 !w-2.5 !border !border-slate-500 !bg-white"
                        />
                    </li>
                ))}
            </ul>

            <div className="px-3 py-2">
                <button
                    type="button"
                    onClick={onAddColumn}
                    className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                    Add Column
                </button>
            </div>
        </div>
    );
}

export default memo(TableNode);
