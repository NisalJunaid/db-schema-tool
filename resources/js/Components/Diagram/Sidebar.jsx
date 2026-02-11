import { useMemo, useState } from 'react';
import ColorPicker from '@/Components/Diagram/ColorPicker';
import { getTableColorMeta } from '@/Components/Diagram/utils';

export default function Sidebar({
    diagramName,
    tables,
    isCollapsed,
    onToggleCollapse,
    onFocusTable,
    onFocusColumn,
    onAddTable,
    onAddColumn,
    onEditColumn,
    onDeleteColumn,
    onUpdateTableColor,
    editMode,
    onToggleEditMode,
    canEdit = true,
}) {
    const [search, setSearch] = useState('');
    const [expandedTables, setExpandedTables] = useState({});
    const [showColorsFor, setShowColorsFor] = useState(null);

    const filteredTables = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return tables;
        }

        return tables
            .map((table) => {
                const tableMatch = table.name?.toLowerCase().includes(query);
                const columns = (table.columns ?? []).filter((column) => column.name?.toLowerCase().includes(query));

                if (tableMatch) {
                    return table;
                }

                if (columns.length) {
                    return { ...table, columns };
                }

                return null;
            })
            .filter(Boolean);
    }, [search, tables]);

    const toggleTable = (tableId) => {
        setExpandedTables((current) => ({
            ...current,
            [tableId]: !current[tableId],
        }));
    };

    if (isCollapsed) {
        return (
            <aside className="flex h-full w-14 flex-col items-center gap-3 border-r border-slate-200 bg-white py-4">
                <button type="button" onClick={onToggleCollapse} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600" title="Expand sidebar">
                    &gt;
                </button>
            </aside>
        );
    }

    return (
        <aside className="flex h-full w-80 flex-col border-r border-slate-200 bg-white">
            <div className="space-y-3 border-b border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">{diagramName}</h2>
                        <p className="text-xs text-slate-500">Tables & fields</p>
                    </div>
                    <button type="button" onClick={onToggleCollapse} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600" title="Collapse sidebar">
                        &lt;
                    </button>
                </div>

                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tables or fields"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={onAddTable}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
                        disabled={!editMode}
                    >
                        Add table
                    </button>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={onToggleEditMode}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                                editMode ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-700'
                            }`}
                        >
                            Edit mode: {editMode ? 'ON' : 'OFF'}
                        </button>
                    )}
                </div>
            </div>

            <div className="sidebar-scroll flex-1 space-y-2 overflow-y-auto p-3">
                {filteredTables.map((table) => {
                    const expanded = expandedTables[table.id] ?? true;
                    const colorMeta = getTableColorMeta(table.color);

                    return (
                        <div
                            key={table.id}
                            className="relative rounded-lg border border-slate-200"
                            style={{ borderLeftWidth: '4px', borderLeftColor: colorMeta.solid }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    toggleTable(table.id);
                                    onFocusTable(table.id);
                                }}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                                style={{ backgroundColor: colorMeta.tint }}
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorMeta.solid }} />
                                    <span className="truncate text-sm font-medium text-slate-800">{table.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {editMode && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setShowColorsFor((current) => (current === table.id ? null : table.id));
                                            }}
                                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                                        >
                                            <span className="block h-3.5 w-3.5 rounded-full border border-white" style={{ backgroundColor: colorMeta.solid }} />
                                        </button>
                                    )}
                                    <span className="text-xs text-slate-500">{expanded ? '−' : '+'}</span>
                                </div>
                            </button>

                            {showColorsFor === table.id && editMode && (
                                <div className="mx-3 mb-2 rounded-md border border-slate-200 bg-white p-2">
                                    <ColorPicker
                                        value={table.color ?? null}
                                        onChange={(color) => {
                                            onUpdateTableColor(table.id, color);
                                            setShowColorsFor(null);
                                        }}
                                    />
                                </div>
                            )}

                            {expanded && (
                                <ul className="border-t border-slate-100 bg-slate-50/70 px-2 py-1">
                                    {(table.columns ?? []).map((column) => (
                                        <li key={column.id}>
                                            <div className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-indigo-50">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onFocusTable(table.id);
                                                        onFocusColumn(column.id);
                                                    }}
                                                    className="flex min-w-0 flex-1 items-center justify-between text-left"
                                                >
                                                    <span className="truncate">{column.name}</span>
                                                    <span className="shrink-0 text-slate-400">{column.type}</span>
                                                </button>

                                                {editMode && (
                                                    <div className="ml-2 flex items-center gap-1">
                                                        <button type="button" onClick={() => onEditColumn(column)} className="rounded p-1 hover:bg-slate-200" title="Edit field">
                                                            ✎
                                                        </button>
                                                        <button type="button" onClick={() => onDeleteColumn(column.id)} className="rounded p-1 text-rose-500 hover:bg-rose-100" title="Delete field">
                                                            🗑
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                    {editMode && (
                                        <li className="px-2 py-1">
                                            <button
                                                type="button"
                                                onClick={() => onAddColumn(table.id)}
                                                className="w-full rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                            >
                                                + Add field
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    );
                })}

                {!filteredTables.length && <p className="px-1 text-xs text-slate-500">No tables match your search.</p>}
            </div>
        </aside>
    );
}
