import { memo, useEffect, useMemo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { toColumnHandleId } from '@/Components/Diagram/utils';

function TableNode({ data }) {
    const table = data?.table ?? {};
    const columns = useMemo(() => (Array.isArray(table.columns) ? table.columns : []), [table.columns]);
    const editMode = Boolean(data?.editMode);
    const selectedColumnId = data?.selectedColumnId ?? null;

    const [isEditingName, setIsEditingName] = useState(false);
    const [localName, setLocalName] = useState(table.name ?? '');

    useEffect(() => {
        setLocalName(table.name ?? '');
    }, [table.name]);

    useEffect(() => {
        if (!editMode) {
            setIsEditingName(false);
        }
    }, [editMode]);

    const commitRename = () => {
        const nextName = localName.trim();

        if (!editMode) {
            setLocalName(table.name ?? '');
            return;
        }

        if (nextName && nextName !== table.name) {
            data?.onRenameTable?.(table.id, nextName);
        } else {
            setLocalName(table.name ?? '');
        }

        setIsEditingName(false);
    };

    return (
        <div className="min-w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                {isEditingName && editMode ? (
                    <input
                        autoFocus
                        value={localName}
                        onChange={(event) => setLocalName(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.currentTarget.blur();
                            }
                            if (event.key === 'Escape') {
                                setLocalName(table.name ?? '');
                                setIsEditingName(false);
                            }
                        }}
                        className="w-full rounded-md border border-indigo-300 px-2 py-1 text-sm font-semibold text-slate-900 focus:outline-none"
                    />
                ) : (
                    <h3 className="truncate pr-2 text-sm font-semibold text-slate-900">{table.name}</h3>
                )}

                <button
                    type="button"
                    disabled={!editMode}
                    onClick={() => editMode && setIsEditingName((current) => !current)}
                    className="rounded-md p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title={editMode ? 'Rename table' : 'Enable edit mode to rename'}
                >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M5 13.586V15h1.414l8.293-8.293-1.414-1.414L5 13.586ZM16.414 4.586a2 2 0 0 0-2.828 0l-.586.586 1.414 1.414.586-.586a2 2 0 0 0 0-2.828Z" />
                    </svg>
                </button>
            </div>

            <div className="divide-y divide-slate-100">
                {columns.map((column) => {
                    const inputHandleId = toColumnHandleId(column.id, 'in');
                    const outputHandleId = toColumnHandleId(column.id, 'out');
                    const isHighlighted = Number(selectedColumnId) === Number(column.id);

                    return (
                        <div
                            key={column.id}
                            className={`relative flex items-center gap-2 px-3 py-2 text-xs transition ${
                                isHighlighted ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-white'
                            }`}
                        >
                            <Handle
                                id={inputHandleId}
                                type="target"
                                position={Position.Left}
                                isConnectable={editMode}
                                className="!left-0 !h-2.5 !w-2.5 !-translate-x-1/2 !border !border-indigo-500 !bg-white"
                                style={{ pointerEvents: editMode ? 'auto' : 'none' }}
                            />

                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pl-2">
                                <span className="truncate font-medium text-slate-900">{column.name}</span>
                                <span className="shrink-0 text-slate-500">{column.type ?? 'string'}</span>
                            </div>

                            <Handle
                                id={outputHandleId}
                                type="source"
                                position={Position.Right}
                                isConnectable={editMode}
                                className="!right-0 !h-2.5 !w-2.5 !translate-x-1/2 !border !border-indigo-500 !bg-white"
                                style={{ pointerEvents: editMode ? 'auto' : 'none' }}
                            />
                        </div>
                    );
                })}
            </div>

            {editMode && (
                <div className="border-t border-slate-200 px-3 py-2">
                    <button
                        type="button"
                        onClick={() => data?.onAddColumn?.(table.id)}
                        className="w-full rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                        + Add column
                    </button>
                </div>
            )}
        </div>
    );
}

export default memo(TableNode);
