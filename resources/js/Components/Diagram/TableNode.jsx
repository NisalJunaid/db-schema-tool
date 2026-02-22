import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position } from 'reactflow';
import ColorPickerPopover from '@/Components/Diagram/ColorPickerPopover';
import { formatColumnType, getTableColorMeta, toColumnHandleId } from '@/Components/Diagram/utils';

function TableNode({ data }) {
    const table = data?.table ?? {};
    const columns = useMemo(() => (Array.isArray(table.columns) ? table.columns : []), [table.columns]);
    const editMode = Boolean(data?.editMode);
    const isActive = Boolean(data?.isActiveEditTable);
    const selectedColumnId = data?.selectedColumnId ?? null;
    const tableXById = data?.tableXById ?? {};
    const columnToTableMap = data?.columnToTableMap ?? {};
    const relationships = Array.isArray(data?.relationships) ? data.relationships : [];
    const colorButtonRef = useRef(null);

    const [isEditingName, setIsEditingName] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const [localName, setLocalName] = useState(table.name ?? '');

    const colorMeta = getTableColorMeta(table.color);

    useEffect(() => {
        setLocalName(table.name ?? '');
    }, [table.name]);

    useEffect(() => {
        if (!editMode) {
            setIsEditingName(false);
            setShowColors(false);
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

    const anchorRect = colorButtonRef.current?.getBoundingClientRect() ?? null;

    return (
        <div className="bg-white rounded-lg shadow border w-full">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2" style={{ backgroundColor: colorMeta.tint }}>
                <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorMeta.solid }} />
                    {isEditingName && editMode && isActive ? (
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
                </div>

                {editMode && (
                    <div className="flex items-center gap-1">
                        <button
                            ref={colorButtonRef}
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setShowColors((current) => !current);
                            }}
                            className="rounded-md p-1 text-slate-500 transition hover:bg-white/70 hover:text-slate-700"
                            title="Table color"
                        >
                            <span className="block h-3.5 w-3.5 rounded-full border border-white" style={{ backgroundColor: colorMeta.solid }} />
                        </button>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                data?.onToggleActiveEditTable?.(table.id);
                                if (isActive) {
                                    setIsEditingName(false);
                                    setShowColors(false);
                                    return;
                                }

                                setIsEditingName(true);
                            }}
                            className={`rounded-md p-1 transition ${
                                isActive ? 'bg-white/80 text-indigo-700' : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                            }`}
                            title="Edit table"
                        >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                <path d="M5 13.586V15h1.414l8.293-8.293-1.414-1.414L5 13.586ZM16.414 4.586a2 2 0 0 0-2.828 0l-.586.586 1.414 1.414.586-.586a2 2 0 0 0 0-2.828Z" />
                            </svg>
                        </button>

                        <ColorPickerPopover
                            open={showColors}
                            anchorRect={anchorRect}
                            value={table.color ?? null}
                            onSelect={(color) => {
                                data?.onUpdateTableColor?.(table.id, color);
                                setShowColors(false);
                            }}
                            onClose={() => setShowColors(false)}
                        />
                    </div>
                )}
            </div>

            <div className="divide-y divide-slate-100">
                {columns.map((column) => {
                    const inputHandleId = toColumnHandleId(column.id, 'in');
                    const outputHandleId = toColumnHandleId(column.id, 'out');
                    const isHighlighted = Number(selectedColumnId) === Number(column.id);
                    const currentX = tableXById[String(table.id)] ?? 0;
                    // Compute handle sides separately for outgoing vs incoming relationships.
                    // Outgoing (source) relationships: column is from_column_id (edge leaves this table)
                    const outXs = relationships
                        .filter((relationship) => Number(relationship.from_column_id) === Number(column.id))
                        .map((relationship) => {
                            const otherTableId = columnToTableMap[relationship.to_column_id];
                            return tableXById[String(otherTableId)] ?? currentX;
                        });
                    const outAvgX = outXs.length ? outXs.reduce((sum, value) => sum + value, 0) / outXs.length : currentX;
                    const outIsRight = outAvgX > currentX;
                    const outPosition = outIsRight ? Position.Right : Position.Left;

                    // Incoming (target) relationships: column is to_column_id (edge enters this table)
                    const inXs = relationships
                        .filter((relationship) => Number(relationship.to_column_id) === Number(column.id))
                        .map((relationship) => {
                            const otherTableId = columnToTableMap[relationship.from_column_id];
                            return tableXById[String(otherTableId)] ?? currentX;
                        });
                    const inAvgX = inXs.length ? inXs.reduce((sum, value) => sum + value, 0) / inXs.length : currentX;
                    const inIsRight = inAvgX > currentX;
                    // IMPORTANT: the target handle should face toward the source table.
                    const inPosition = inIsRight ? Position.Right : Position.Left;
                    const inputHandleSideClass = inPosition === Position.Left
                        ? '!left-0 !-translate-x-1/2'
                        : '!right-0 !translate-x-1/2';
                    const outputHandleSideClass = outPosition === Position.Right
                        ? '!right-0 !translate-x-1/2'
                        : '!left-0 !-translate-x-1/2';

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
                                position={inPosition}
                                isConnectable={editMode}
                                className={`${inputHandleSideClass} !h-2.5 !w-2.5 !border !border-indigo-500 !bg-white`}
                                style={{ pointerEvents: editMode ? 'auto' : 'none' }}
                            />

                            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pl-2">
                                <span className="truncate font-medium text-slate-900">{column.name}</span>
                                <span className="shrink-0 text-slate-500">{formatColumnType(column)}</span>
                            </div>

                            {editMode && isActive && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => data?.onEditColumn?.(column)}
                                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        ✎
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => data?.onDeleteColumn?.(column.id)}
                                        className="rounded p-1 text-rose-500 hover:bg-rose-50"
                                    >
                                        🗑
                                    </button>
                                </div>
                            )}

                            <Handle
                                id={outputHandleId}
                                type="source"
                                position={outPosition}
                                isConnectable={editMode}
                                className={`${outputHandleSideClass} !h-2.5 !w-2.5 !border !border-indigo-500 !bg-white`}
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
                        + Add field
                    </button>
                </div>
            )}
        </div>
    );
}

export default memo(TableNode);
