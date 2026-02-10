import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

function TableNode({ data }) {
    const table = data?.table ?? {};
    const columns = Array.isArray(table.columns) ? table.columns : [];
    const [localName, setLocalName] = useState(table.name ?? '');

    const commitRename = () => {
        const next = localName.trim();

        if (next && next !== table.name) {
            data?.onRenameTable?.(table.id, next);
        } else {
            setLocalName(table.name ?? '');
        }
    };

    return (
        <div className="min-w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                <input
                    className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-900 focus:border-indigo-300 focus:bg-white focus:outline-none"
                    value={localName}
                    onChange={(event) => setLocalName(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                />
            </div>

            <div className="divide-y divide-slate-100">
                {columns.map((column) => {
                    const handleId = `col-${column.id}`;

                    return (
                        <div key={column.id} className="relative flex items-center gap-2 px-3 py-2 text-xs">
                            <Handle
                                id={handleId}
                                type="target"
                                position={Position.Left}
                                className="!left-0 !h-2.5 !w-2.5 !-translate-x-1/2 !border !border-indigo-500 !bg-white"
                            />

                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pl-2">
                                <span className="truncate font-medium text-slate-900">{column.name}</span>
                                <span className="shrink-0 text-slate-500">{column.type ?? 'string'}</span>
                            </div>

                            <Handle
                                id={handleId}
                                type="source"
                                position={Position.Right}
                                className="!right-0 !h-2.5 !w-2.5 !translate-x-1/2 !border !border-indigo-500 !bg-white"
                            />
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-slate-200 px-3 py-2">
                <button
                    type="button"
                    onClick={() => data?.onAddColumn?.(table.id)}
                    className="w-full rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                    + Add column
                </button>
            </div>
        </div>
    );
}

export default memo(TableNode);
