import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Background, Controls, MiniMap, ReactFlow, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import TableNode from '@/Components/Diagram/TableNode';
import Sidebar from '@/Components/Diagram/Sidebar';
import AddColumnModal from '@/Components/Diagram/modals/AddColumnModal';
import AddTableModal from '@/Components/Diagram/modals/AddTableModal';
import RelationshipModal from '@/Components/Diagram/modals/RelationshipModal';
import {
    asCollection,
    parseColumnIdFromHandle,
    relationshipLabel,
    toColumnHandleId,
} from '@/Components/Diagram/utils';
import { api, SESSION_EXPIRED_MESSAGE } from '@/lib/api';

const defaultTableSize = { w: 320, h: 240 };
const defaultColumnForm = {
    tableId: '',
    preset: '',
    name: '',
    type: 'VARCHAR(255)',
    nullable: false,
    primary: false,
    unique: false,
    default: '',
};

function normalizeTable(rawTable) {
    return {
        ...rawTable,
        columns: asCollection(rawTable.columns ?? rawTable.diagram_columns, 'diagram_columns'),
    };
}

export default function DiagramEditor() {
    const { diagramId } = usePage().props;
    const reactFlowRef = useRef(null);

    const [diagram, setDiagram] = useState(null);
    const [tables, setTables] = useState([]);
    const [relationships, setRelationships] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingState, setSavingState] = useState('Autosaved');

    const [editMode, setEditMode] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeEditTableId, setActiveEditTableId] = useState(null);
    const [selectedColumnId, setSelectedColumnId] = useState(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

    const [showAddTableModal, setShowAddTableModal] = useState(false);
    const [addTableForm, setAddTableForm] = useState({ name: '', schema: '' });
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [columnModalMode, setColumnModalMode] = useState('create');
    const [editingColumn, setEditingColumn] = useState(null);
    const [addColumnForm, setAddColumnForm] = useState(defaultColumnForm);
    const [relationshipDraft, setRelationshipDraft] = useState(null);
    const [relationshipModalState, setRelationshipModalState] = useState({ open: false, mode: 'create', type: 'one_to_many' });
    const [formErrors, setFormErrors] = useState({});

    const viewportSaveTimerRef = useRef(null);

    const columnToTableMap = useMemo(() => {
        const map = {};
        tables.forEach((table) => {
            (table.columns ?? []).forEach((column) => {
                map[column.id] = table.id;
            });
        });
        return map;
    }, [tables]);

    const handle401 = useCallback((message) => {
        setError(message ?? `${SESSION_EXPIRED_MESSAGE} to continue editing.`);
    }, []);

    const onRenameTable = useCallback(
        async (tableId, name) => {
            if (!editMode) {
                return;
            }

            const previousTables = tables;
            setTables((current) => current.map((entry) => (entry.id === tableId ? { ...entry, name } : entry)));

            try {
                setSavingState('Saving...');
                await api.patch(`/api/v1/diagram-tables/${tableId}`, { name });
                setSavingState('Autosaved');
            } catch (renameError) {
                setTables(previousTables);
                setSavingState('Error');
                if (renameError?.status === 401) {
                    handle401();
                    return;
                }
                setError(renameError.message || 'Failed to rename table.');
            }
        },
        [editMode, handle401, tables],
    );

    const onUpdateTableColor = useCallback(
        async (tableId, color) => {
            if (!editMode) {
                return;
            }

            const previousTables = tables;
            setTables((current) => current.map((table) => (table.id === tableId ? { ...table, color } : table)));

            try {
                setSavingState('Saving...');
                await api.patch(`/api/v1/diagram-tables/${tableId}`, { color });
                setSavingState('Autosaved');
            } catch (updateError) {
                setTables(previousTables);
                setSavingState('Error');
                setError(updateError.message || 'Failed to update table color.');
            }
        },
        [editMode, tables],
    );

    const onAddColumn = useCallback((tableId) => {
        setFormErrors({});
        setColumnModalMode('create');
        setEditingColumn(null);
        setAddColumnForm({ ...defaultColumnForm, tableId: String(tableId) });
        setShowAddColumnModal(true);
    }, []);

    const onEditColumn = useCallback((column) => {
        setFormErrors({});
        setColumnModalMode('edit');
        setEditingColumn(column);
        setAddColumnForm((current) => ({
            ...current,
            tableId: String(column.diagram_table_id),
            name: column.name,
            type: column.type,
            nullable: Boolean(column.nullable),
            primary: Boolean(column.primary),
            unique: Boolean(column.unique),
            default: column.default ?? '',
            preset: '',
        }));
        setShowAddColumnModal(true);
    }, []);

    const onDeleteColumn = useCallback(
        async (columnId) => {
            if (!editMode || !window.confirm('Delete this field?')) {
                return;
            }

            const previousTables = tables;
            setTables((current) =>
                current.map((table) => ({
                    ...table,
                    columns: (table.columns ?? []).filter((column) => Number(column.id) !== Number(columnId)),
                })),
            );
            setRelationships((current) =>
                current.filter(
                    (relationship) =>
                        Number(relationship.from_column_id) !== Number(columnId) && Number(relationship.to_column_id) !== Number(columnId),
                ),
            );

            try {
                setSavingState('Saving...');
                await api.delete(`/api/v1/diagram-columns/${columnId}`);
                setSavingState('Autosaved');
            } catch (deleteError) {
                setTables(previousTables);
                setSavingState('Error');
                setError(deleteError.message || 'Failed to delete field.');
            }
        },
        [editMode, tables],
    );

    const buildNodeData = useCallback(
        (table) => ({
            table,
            editMode,
            selectedColumnId,
            isActiveEditTable: Number(activeEditTableId) === Number(table.id),
            onSetActiveEditTable: setActiveEditTableId,
            onRenameTable,
            onUpdateTableColor,
            onAddColumn,
            onEditColumn,
            onDeleteColumn,
        }),
        [activeEditTableId, editMode, onAddColumn, onDeleteColumn, onEditColumn, onRenameTable, onUpdateTableColor, selectedColumnId],
    );

    useEffect(() => {
        setNodes(
            tables.map((table) => ({
                id: String(table.id),
                type: 'tableNode',
                draggable: editMode,
                position: {
                    x: Number(table.x ?? 0),
                    y: Number(table.y ?? 0),
                },
                data: buildNodeData(table),
                style: {
                    width: Number(table.w ?? defaultTableSize.w),
                    height: Number(table.h ?? defaultTableSize.h),
                },
            })),
        );
    }, [tables, editMode, selectedColumnId, buildNodeData]);

    const edges = useMemo(
        () =>
            relationships
                .map((relationship) => {
                    const sourceTableId = columnToTableMap[relationship.from_column_id];
                    const targetTableId = columnToTableMap[relationship.to_column_id];

                    if (!sourceTableId || !targetTableId) {
                        return null;
                    }

                    const isHovered = hoveredEdgeId === String(relationship.id);
                    return {
                        id: String(relationship.id),
                        source: String(sourceTableId),
                        target: String(targetTableId),
                        sourceHandle: relationship.sourceHandle || toColumnHandleId(relationship.from_column_id, 'out'),
                        targetHandle: relationship.targetHandle || toColumnHandleId(relationship.to_column_id, 'in'),
                        type: 'default',
                        label: relationshipLabel(relationship.type),
                        animated: false,
                        data: { type: relationship.type },
                        style: {
                            strokeWidth: isHovered ? 3 : 2,
                            stroke: isHovered ? '#4f46e5' : '#64748b',
                        },
                        labelStyle: {
                            fill: '#334155',
                            fontSize: 11,
                            fontWeight: 600,
                        },
                    };
                })
                .filter(Boolean),
        [relationships, hoveredEdgeId, columnToTableMap],
    );

    useEffect(() => {
        const loadDiagram = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await api.get(`/api/v1/diagrams/${diagramId}`);
                const diagramPayload = response?.data ?? response;
                const normalizedTables = asCollection(diagramPayload.diagram_tables ?? diagramPayload.diagramTables, 'diagram_tables').map(
                    normalizeTable,
                );

                const relationshipRows = asCollection(
                    diagramPayload.diagram_relationships ?? diagramPayload.diagramRelationships,
                    'diagram_relationships',
                ).map((relationship) => ({
                    ...relationship,
                    sourceHandle: relationship.sourceHandle || toColumnHandleId(relationship.from_column_id, 'out'),
                    targetHandle: relationship.targetHandle || toColumnHandleId(relationship.to_column_id, 'in'),
                }));

                setDiagram(diagramPayload);
                setTables(normalizedTables);
                setRelationships(relationshipRows);
            } catch (loadError) {
                if (loadError?.status === 401) {
                    handle401();
                    return;
                }

                setError(loadError.message || 'Unable to load diagram.');
            } finally {
                setLoading(false);
            }
        };

        loadDiagram();
    }, [diagramId, handle401]);

    const onNodesChange = useCallback((changes) => {
        setNodes((current) => applyNodeChanges(changes, current));
    }, []);

    const onConnect = useCallback(
        (connection) => {
            if (!editMode) {
                return;
            }

            const sourceColumnId = parseColumnIdFromHandle(connection.sourceHandle);
            const targetColumnId = parseColumnIdFromHandle(connection.targetHandle);

            if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
                return;
            }

            const isDuplicate = relationships.some(
                (entry) => Number(entry.from_column_id) === sourceColumnId && Number(entry.to_column_id) === targetColumnId,
            );

            if (isDuplicate) {
                return;
            }

            setRelationshipDraft({
                sourceHandle: connection.sourceHandle,
                targetHandle: connection.targetHandle,
                from_column_id: sourceColumnId,
                to_column_id: targetColumnId,
            });
            setRelationshipModalState({ open: true, mode: 'create', type: 'one_to_many' });
        },
        [editMode, relationships],
    );

    const onEdgeClick = useCallback(
        (_, edge) => {
            if (!editMode) {
                return;
            }
            const relationship = relationships.find((entry) => String(entry.id) === String(edge.id));
            if (!relationship) {
                return;
            }
            setRelationshipDraft(relationship);
            setRelationshipModalState({ open: true, mode: 'edit', type: relationship.type ?? 'one_to_many' });
        },
        [editMode, relationships],
    );

    const submitRelationship = async (event) => {
        event.preventDefault();
        if (!relationshipDraft) {
            return;
        }

        if (relationshipModalState.mode === 'create') {
            try {
                setSavingState('Saving...');
                const response = await api.post('/api/v1/diagram-relationships', {
                    diagram_id: Number(diagramId),
                    from_column_id: relationshipDraft.from_column_id,
                    to_column_id: relationshipDraft.to_column_id,
                    type: relationshipModalState.type,
                });
                const created = response?.data ?? response;
                setRelationships((current) => [
                    ...current,
                    {
                        ...created,
                        sourceHandle: relationshipDraft.sourceHandle,
                        targetHandle: relationshipDraft.targetHandle,
                    },
                ]);
                setSavingState('Autosaved');
            } catch (connectError) {
                setSavingState('Error');
                setError(connectError.message || 'Failed to create relationship.');
            }
        } else {
            const relationshipId = relationshipDraft.id;
            const previous = relationships;
            setRelationships((current) => current.map((item) => (item.id === relationshipId ? { ...item, type: relationshipModalState.type } : item)));
            try {
                setSavingState('Saving...');
                await api.patch(`/api/v1/diagram-relationships/${relationshipId}`, { type: relationshipModalState.type });
                setSavingState('Autosaved');
            } catch (updateError) {
                setRelationships(previous);
                setSavingState('Error');
                setError(updateError.message || 'Failed to update relationship.');
            }
        }

        setRelationshipModalState((state) => ({ ...state, open: false }));
        setRelationshipDraft(null);
    };

    const onNodeDragStop = useCallback(
        async (_, node) => {
            try {
                setSavingState('Saving...');
                await api.patch(`/api/v1/diagram-tables/${node.id}`, {
                    x: Math.round(node.position.x),
                    y: Math.round(node.position.y),
                    w: Math.round(node.width ?? defaultTableSize.w),
                    h: Math.round(node.height ?? defaultTableSize.h),
                });

                setTables((current) =>
                    current.map((table) =>
                        String(table.id) === String(node.id)
                            ? {
                                  ...table,
                                  x: Math.round(node.position.x),
                                  y: Math.round(node.position.y),
                                  w: Math.round(node.width ?? defaultTableSize.w),
                                  h: Math.round(node.height ?? defaultTableSize.h),
                              }
                            : table,
                    ),
                );
                setSavingState('Autosaved');
            } catch (dragError) {
                setSavingState('Error');
                if (dragError?.status === 401) {
                    handle401();
                    return;
                }

                setError(dragError.message || 'Failed to update table position.');
            }
        },
        [handle401],
    );

    const handleViewportSave = useCallback(
        (viewport) => {
            if (viewportSaveTimerRef.current) {
                clearTimeout(viewportSaveTimerRef.current);
            }

            viewportSaveTimerRef.current = setTimeout(async () => {
                try {
                    setSavingState('Saving...');
                    await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport });
                    setSavingState('Autosaved');
                } catch (viewportError) {
                    setSavingState('Error');
                    if (viewportError?.status === 401) {
                        handle401();
                        return;
                    }

                    setError(viewportError.message || 'Failed to save viewport.');
                }
            }, 450);
        },
        [diagramId, handle401],
    );

    const submitAddTable = async (event) => {
        event.preventDefault();
        if (!editMode) {
            return;
        }

        setFormErrors({});

        try {
            setSavingState('Saving...');
            const response = await api.post('/api/v1/diagram-tables', {
                diagram_id: Number(diagramId),
                name: addTableForm.name,
                schema: addTableForm.schema || null,
                x: 120,
                y: 120,
                w: defaultTableSize.w,
                h: defaultTableSize.h,
            });

            const created = normalizeTable(response?.data ?? response);
            setTables((current) => [...current, created]);
            setShowAddTableModal(false);
            setAddTableForm({ name: '', schema: '' });
            setSavingState('Autosaved');
        } catch (submitError) {
            setSavingState('Error');
            const validationErrors = submitError?.payload?.errors ?? {};
            setFormErrors(
                Object.keys(validationErrors).length ? validationErrors : { general: [submitError.message || 'Failed to create table.'] },
            );
        }
    };

    const submitAddColumn = async (event) => {
        event.preventDefault();
        if (!editMode) {
            return;
        }

        setFormErrors({});

        try {
            setSavingState('Saving...');
            if (columnModalMode === 'create') {
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
                setTables((current) =>
                    current.map((table) =>
                        String(table.id) === String(addColumnForm.tableId)
                            ? { ...table, columns: [...(table.columns ?? []), createdColumn] }
                            : table,
                    ),
                );
            } else {
                const response = await api.patch(`/api/v1/diagram-columns/${editingColumn.id}`, {
                    name: addColumnForm.name,
                    type: addColumnForm.type,
                    nullable: addColumnForm.nullable,
                    primary: addColumnForm.primary,
                    unique: addColumnForm.unique,
                    default: addColumnForm.default || null,
                });
                const updatedColumn = response?.data ?? response;
                setTables((current) =>
                    current.map((table) => ({
                        ...table,
                        columns: (table.columns ?? []).map((column) =>
                            Number(column.id) === Number(updatedColumn.id) ? updatedColumn : column,
                        ),
                    })),
                );
            }

            setShowAddColumnModal(false);
            setEditingColumn(null);
            setAddColumnForm(defaultColumnForm);
            setSavingState('Autosaved');
        } catch (submitError) {
            setSavingState('Error');
            const validationErrors = submitError?.payload?.errors ?? {};
            setFormErrors(
                Object.keys(validationErrors).length
                    ? validationErrors
                    : { general: [submitError.message || 'Failed to save column.'] },
            );
        }
    };

    const focusOnTable = useCallback(
        (tableId) => {
            const node = nodes.find((entry) => entry.id === String(tableId));
            if (!node) {
                return;
            }

            reactFlowRef.current?.setCenter(node.position.x + 160, node.position.y + 100, {
                zoom: 1.1,
                duration: 500,
            });
        },
        [nodes],
    );

    const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

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

            <section className="flex h-screen bg-slate-100">
                <Sidebar
                    diagramName={diagram?.name || `Diagram #${diagramId}`}
                    tables={tables}
                    isCollapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
                    onFocusTable={focusOnTable}
                    onFocusColumn={setSelectedColumnId}
                    onAddTable={() => {
                        if (!editMode) {
                            return;
                        }
                        setFormErrors({});
                        setShowAddTableModal(true);
                    }}
                    onAddColumn={onAddColumn}
                    onEditColumn={onEditColumn}
                    onDeleteColumn={onDeleteColumn}
                    onUpdateTableColor={onUpdateTableColor}
                    editMode={editMode}
                    onToggleEditMode={() => {
                        setEditMode((current) => !current);
                        setActiveEditTableId(null);
                    }}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
                        <div>
                            <h1 className="text-base font-semibold text-slate-900">{diagram?.name || `Diagram #${diagramId}`}</h1>
                            <p className="text-xs text-slate-500">React Flow diagram editor</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditMode((current) => !current);
                                    setActiveEditTableId(null);
                                }}
                                className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                                    editMode
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-300 bg-slate-50 text-slate-700'
                                }`}
                            >
                                Edit mode: {editMode ? 'ON' : 'OFF'}
                            </button>

                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{savingState}</span>

                            <button
                                type="button"
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                                onClick={() => reactFlowRef.current?.fitView({ padding: 0.2, duration: 350 })}
                            >
                                Fit view
                            </button>
                        </div>
                    </div>

                    {!editMode && (
                        <div className="mx-4 mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">View mode</div>
                    )}

                    {error && (
                        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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

                    <div className="m-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            fitView
                            onInit={(instance) => {
                                reactFlowRef.current = instance;
                            }}
                            nodesDraggable={editMode}
                            onNodesChange={onNodesChange}
                            onNodeDragStop={onNodeDragStop}
                            onConnect={onConnect}
                            onEdgeClick={onEdgeClick}
                            onMoveEnd={(_, viewport) => handleViewportSave(viewport)}
                            onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
                            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
                            proOptions={{ hideAttribution: true }}
                            defaultEdgeOptions={{ type: 'bezier' }}
                            connectionMode="strict"
                        >
                            <Background gap={20} size={1} color="#cbd5e1" />
                            <MiniMap pannable zoomable />
                            <Controls showInteractive={false} />
                        </ReactFlow>
                    </div>
                </div>
            </section>

            <AddTableModal
                open={showAddTableModal}
                form={addTableForm}
                errors={formErrors}
                onChange={(field, value) => setAddTableForm((current) => ({ ...current, [field]: value }))}
                onClose={() => setShowAddTableModal(false)}
                onSubmit={submitAddTable}
            />

            <AddColumnModal
                isOpen={showAddColumnModal}
                mode={columnModalMode}
                form={addColumnForm}
                column={editingColumn}
                errors={formErrors}
                onChange={(field, value) => setAddColumnForm((current) => ({ ...current, [field]: value }))}
                onClose={() => {
                    setShowAddColumnModal(false);
                    setEditingColumn(null);
                    setAddColumnForm(defaultColumnForm);
                }}
                onSubmit={submitAddColumn}
            />

            <RelationshipModal
                isOpen={relationshipModalState.open}
                mode={relationshipModalState.mode}
                relationshipType={relationshipModalState.type}
                onTypeChange={(type) => setRelationshipModalState((state) => ({ ...state, type }))}
                onClose={() => {
                    setRelationshipModalState((state) => ({ ...state, open: false }));
                    setRelationshipDraft(null);
                }}
                onSubmit={submitRelationship}
            />
        </>
    );
}

DiagramEditor.layout = (page) => page;
