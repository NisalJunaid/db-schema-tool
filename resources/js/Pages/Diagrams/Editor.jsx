import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import TableNode from '@/Components/TableNode';
import { api, SESSION_EXPIRED_MESSAGE } from '@/lib/api';

const defaultTableSize = { w: 320, h: 240 };

function asCollection(value, fallbackKey) {
    if (Array.isArray(value)) {
        return value;
    }

    if (Array.isArray(value?.data)) {
        return value.data;
    }

    if (Array.isArray(value?.[fallbackKey])) {
        return value[fallbackKey];
    }

    return [];
}

function mapTableToNode(table, callbacks) {
    return {
        id: String(table.id),
        type: 'tableNode',
        position: {
            x: Number(table.x ?? 0),
            y: Number(table.y ?? 0),
        },
        data: {
            table: {
                ...table,
                columns: asCollection(table.columns),
            },
            ...callbacks,
        },
        style: {
            width: Number(table.w ?? defaultTableSize.w),
            height: Number(table.h ?? defaultTableSize.h),
        },
    };
}

function mapRelationshipToEdge(relationship) {
    return {
        id: String(relationship.id),
        source: String(relationship.from_table_id ?? relationship.source_table_id ?? ''),
        target: String(relationship.to_table_id ?? relationship.target_table_id ?? ''),
        sourceHandle: `col-${relationship.from_column_id}`,
        targetHandle: `col-${relationship.to_column_id}`,
        animated: false,
        style: { strokeWidth: 2 },
        markerEnd: 'url(#react-flow__arrowclosed)',
        data: { relationship },
    };
}

export default function DiagramEditor() {
    const { diagramId } = usePage().props;

    const [diagram, setDiagram] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingState, setSavingState] = useState('saved');

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const [showAddTableModal, setShowAddTableModal] = useState(false);
    const [addTableForm, setAddTableForm] = useState({ name: '', schema: '' });

    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [addColumnForm, setAddColumnForm] = useState({
        tableId: '',
        name: '',
        type: 'varchar(255)',
        nullable: false,
        primary: false,
        unique: false,
        default: '',
    });

    const [formErrors, setFormErrors] = useState({});

    const callbacks = useMemo(
        () => ({
            onRenameTable: async (tableId, name) => {
                try {
                    setSavingState('saving');
                    await api.patch(`/api/v1/diagram-tables/${tableId}`, { name });

                    setNodes((currentNodes) =>
                        currentNodes.map((node) =>
                            node.id === String(tableId)
                                ? {
                                      ...node,
                                      data: {
                                          ...node.data,
                                          table: { ...node.data.table, name },
                                      },
                                  }
                                : node,
                        ),
                    );
                    setSavingState('saved');
                } catch (renameError) {
                    setSavingState('error');
                    if (renameError?.status === 401) {
                        setError(`${SESSION_EXPIRED_MESSAGE} to continue editing.`);
                        return;
                    }

                    setError(renameError.message || 'Failed to rename table.');
                }
            },
            onAddColumn: (tableId) => {
                setFormErrors({});
                setAddColumnForm((current) => ({ ...current, tableId: String(tableId) }));
                setShowAddColumnModal(true);
            },
        }),
        [setNodes],
    );

    const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

    const hydrateDiagram = useCallback(
        (rawDiagram) => {
            const diagramData = rawDiagram?.data ?? rawDiagram;
            const tables = asCollection(diagramData?.diagram_tables, 'diagram_tables').map((table) => ({
                ...table,
                columns: asCollection(table.columns),
            }));

            const tableByColumn = tables.reduce((carry, table) => {
                table.columns.forEach((column) => {
                    carry[column.id] = table.id;
                });
                return carry;
            }, {});

            const relationships = asCollection(diagramData?.diagram_relationships, 'diagram_relationships').map(
                (relationship) => ({
                    ...relationship,
                    from_table_id: tableByColumn[relationship.from_column_id],
                    to_table_id: tableByColumn[relationship.to_column_id],
                }),
            );

            setDiagram(diagramData);
            setNodes(tables.map((table) => mapTableToNode(table, callbacks)));
            setEdges(
                relationships
                    .filter((relationship) => relationship.from_table_id && relationship.to_table_id)
                    .map(mapRelationshipToEdge),
            );
        },
        [callbacks, setEdges, setNodes],
    );

    useEffect(() => {
        const loadDiagram = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await api.get(`/api/v1/diagrams/${diagramId}`);
                hydrateDiagram(response);
            } catch (loadError) {
                if (loadError?.status === 401) {
                    setError(`${SESSION_EXPIRED_MESSAGE} to continue editing.`);
                    return;
                }

                setError(loadError.message || 'Unable to load diagram.');
            } finally {
                setLoading(false);
            }
        };

        loadDiagram();
    }, [diagramId, hydrateDiagram]);

    const onConnect = useCallback(
        async (connection) => {
            const sourceColumnId = Number((connection.sourceHandle || '').replace('col-', ''));
            const targetColumnId = Number((connection.targetHandle || '').replace('col-', ''));

            if (!sourceColumnId || !targetColumnId) {
                return;
            }

            try {
                setSavingState('saving');
                const response = await api.post('/api/v1/diagram-relationships', {
                    diagram_id: diagramId,
                    from_column_id: sourceColumnId,
                    to_column_id: targetColumnId,
                    type: 'one_to_many',
                });

                const relationship = response?.data ?? response;
                const edge = {
                    id: String(relationship.id),
                    source: connection.source,
                    target: connection.target,
                    sourceHandle: connection.sourceHandle,
                    targetHandle: connection.targetHandle,
                    markerEnd: 'url(#react-flow__arrowclosed)',
                    style: { strokeWidth: 2 },
                };

                setEdges((currentEdges) => [...currentEdges, edge]);
                setSavingState('saved');
            } catch (connectError) {
                setSavingState('error');
                if (connectError?.status === 401) {
                    setError(`${SESSION_EXPIRED_MESSAGE} to continue editing.`);
                    return;
                }

                setError(connectError.message || 'Failed to create relationship.');
            }
        },
        [diagramId, setEdges],
    );

    const onNodeDragStop = useCallback(async (_, node) => {
        try {
            setSavingState('saving');
            await api.patch(`/api/v1/diagram-tables/${node.id}`, {
                x: Math.round(node.position.x),
                y: Math.round(node.position.y),
                w: Math.round(node.width ?? defaultTableSize.w),
                h: Math.round(node.height ?? defaultTableSize.h),
            });
            setSavingState('saved');
        } catch (dragError) {
            setSavingState('error');
            if (dragError?.status === 401) {
                setError(`${SESSION_EXPIRED_MESSAGE} to continue editing.`);
                return;
            }

            setError(dragError.message || 'Failed to update table position.');
        }
    }, []);

    const submitAddTable = async (event) => {
        event.preventDefault();
        setFormErrors({});

        try {
            setSavingState('saving');
            const response = await api.post('/api/v1/diagram-tables', {
                diagram_id: Number(diagramId),
                name: addTableForm.name,
                schema: addTableForm.schema || null,
                x: 120,
                y: 120,
                w: defaultTableSize.w,
                h: defaultTableSize.h,
            });

            const created = response?.data ?? response;
            const node = mapTableToNode({ ...created, columns: [] }, callbacks);
            setNodes((currentNodes) => [...currentNodes, node]);
            setShowAddTableModal(false);
            setAddTableForm({ name: '', schema: '' });
            setSavingState('saved');
        } catch (submitError) {
            if (submitError?.status === 401) {
                setFormErrors({ general: [SESSION_EXPIRED_MESSAGE] });
                setSavingState('error');
                return;
            }

            const validationErrors = submitError?.payload?.errors ?? {};
            setFormErrors(validationErrors);
            setSavingState('error');
            if (Object.keys(validationErrors).length === 0) {
                setFormErrors({ general: [submitError.message || 'Failed to create table.'] });
            }
        }
    };

    const submitAddColumn = async (event) => {
        event.preventDefault();
        setFormErrors({});

        try {
            setSavingState('saving');
            const response = await api.post('/api/v1/diagram-columns', {
                diagram_table_id: Number(addColumnForm.tableId),
                name: addColumnForm.name,
                type: addColumnForm.type,
                nullable: addColumnForm.nullable,
                primary: addColumnForm.primary,
                unique: addColumnForm.unique,
                default: addColumnForm.default || null,
            });

            const createdColumn = response?.data ?? response;

            setNodes((currentNodes) =>
                currentNodes.map((node) =>
                    node.id === String(addColumnForm.tableId)
                        ? {
                              ...node,
                              data: {
                                  ...node.data,
                                  table: {
                                      ...node.data.table,
                                      columns: [...(node.data.table.columns ?? []), createdColumn],
                                  },
                              },
                          }
                        : node,
                ),
            );

            setShowAddColumnModal(false);
            setAddColumnForm({
                tableId: '',
                name: '',
                type: 'varchar(255)',
                nullable: false,
                primary: false,
                unique: false,
                default: '',
            });
            setSavingState('saved');
        } catch (submitError) {
            if (submitError?.status === 401) {
                setFormErrors({ general: [SESSION_EXPIRED_MESSAGE] });
                setSavingState('error');
                return;
            }

            const validationErrors = submitError?.payload?.errors ?? {};
            setFormErrors(validationErrors);
            setSavingState('error');
            if (Object.keys(validationErrors).length === 0) {
                setFormErrors({ general: [submitError.message || 'Failed to create column.'] });
            }
        }
    };

    if (loading) {
        return (
            <section className="flex h-screen items-center justify-center">
                <p className="text-sm text-slate-600">Loading diagram…</p>
            </section>
        );
    }

    return (
        <>
            <Head title={diagram?.name ? `Diagram: ${diagram.name}` : `Diagram ${diagramId}`} />

            <section className="flex h-screen flex-col bg-slate-100">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">{diagram?.name || `Diagram #${diagramId}`}</h1>
                        <p className="text-xs text-slate-500">
                            Autosave:{' '}
                            <span
                                className={`font-semibold ${
                                    savingState === 'saved'
                                        ? 'text-emerald-600'
                                        : savingState === 'saving'
                                          ? 'text-amber-600'
                                          : 'text-red-600'
                                }`}
                            >
                                {savingState}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        onClick={() => {
                            setFormErrors({});
                            setShowAddTableModal(true);
                        }}
                    >
                        Add table
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => router.get('/login')}
                            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                            Sign in
                        </button>
                    </div>
                )}

                <div className="min-h-0 flex-1 p-6">
                    <div className="h-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeDragStop={onNodeDragStop}
                            fitView
                            className="h-full w-full"
                        >
                            <MiniMap pannable zoomable />
                            <Controls />
                            <Background gap={20} size={1} />
                        </ReactFlow>
                    </div>
                </div>
            </section>

            {showAddTableModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-slate-900">Add table</h2>
                        <form className="mt-4 space-y-4" onSubmit={submitAddTable}>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Table name</label>
                                <input
                                    required
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={addTableForm.name}
                                    onChange={(event) => setAddTableForm((current) => ({ ...current, name: event.target.value }))}
                                />
                                {formErrors?.name?.[0] && <p className="mt-1 text-xs text-red-600">{formErrors.name[0]}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Schema (optional)</label>
                                <input
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={addTableForm.schema}
                                    onChange={(event) =>
                                        setAddTableForm((current) => ({ ...current, schema: event.target.value }))
                                    }
                                />
                            </div>

                            {formErrors?.general?.[0] && <p className="text-sm text-red-600">{formErrors.general[0]}</p>}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTableModal(false)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
                                    Create table
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddColumnModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-slate-900">Add column</h2>
                        <form className="mt-4 space-y-4" onSubmit={submitAddColumn}>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Column name</label>
                                <input
                                    required
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={addColumnForm.name}
                                    onChange={(event) => setAddColumnForm((current) => ({ ...current, name: event.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                                <input
                                    required
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={addColumnForm.type}
                                    onChange={(event) => setAddColumnForm((current) => ({ ...current, type: event.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Default</label>
                                <input
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={addColumnForm.default}
                                    onChange={(event) =>
                                        setAddColumnForm((current) => ({ ...current, default: event.target.value }))
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-sm">
                                {[
                                    ['nullable', 'Nullable'],
                                    ['primary', 'Primary'],
                                    ['unique', 'Unique'],
                                ].map(([field, label]) => (
                                    <label key={field} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={addColumnForm[field]}
                                            onChange={(event) =>
                                                setAddColumnForm((current) => ({
                                                    ...current,
                                                    [field]: event.target.checked,
                                                }))
                                            }
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>

                            {formErrors?.general?.[0] && <p className="text-sm text-red-600">{formErrors.general[0]}</p>}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddColumnModal(false)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
                                    Add column
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

DiagramEditor.layout = (page) => page;
