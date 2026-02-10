import { useMemo, useState } from 'react';

export default function Sidebar({
    diagramName,
    tables,
    isCollapsed,
    onToggleCollapse,
    onFocusTable,
    onFocusColumn,
    onAddTable,
    editMode,
    onToggleEditMode,
}) {
    const [search, setSearch] = useState('');
    const [expandedTables, setExpandedTables] = useState({});

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
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
                    title="Expand sidebar"
                >
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
                        <p className="text-xs text-slate-500">Tables & columns</p>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
                        title="Collapse sidebar"
                    >
                        &lt;
                    </button>
                </div>

                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tables or columns"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={onAddTable}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                        Add table
                    </button>
                    <button
                        type="button"
                        onClick={onToggleEditMode}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            editMode
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-300 bg-slate-50 text-slate-700'
                        }`}
                    >
                        Edit mode: {editMode ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {filteredTables.map((table) => {
                    const expanded = expandedTables[table.id] ?? true;

                    return (
                        <div key={table.id} className="rounded-lg border border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    toggleTable(table.id);
                                    onFocusTable(table.id);
                                }}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                            >
                                <span className="truncate text-sm font-medium text-slate-800">{table.name}</span>
                                <span className="text-xs text-slate-500">{expanded ? '−' : '+'}</span>
                            </button>

                            {expanded && (
                                <ul className="border-t border-slate-100 bg-slate-50/70 px-2 py-1">
                                    {(table.columns ?? []).map((column) => (
                                        <li key={column.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onFocusTable(table.id);
                                                    onFocusColumn(column.id);
                                                }}
                                                className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-indigo-50"
                                            >
                                                <span className="truncate">{column.name}</span>
                                                <span className="shrink-0 text-slate-400">{column.type}</span>
                                            </button>
                                        </li>
                                    ))}
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
