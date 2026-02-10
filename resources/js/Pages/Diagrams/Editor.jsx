import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    MarkerType,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import TableNode from '@/Components/TableNode';

const API_PREFIX = '/api/api/v1';

const tableToNode = (table) => ({
    id: String(table.id),
    position: {
        x: Number(table.x ?? 0),
        y: Number(table.y ?? 0),
    },
    data: {
        tableId: table.id,
        name: table.name,
        schema: table.schema,
        columns: Array.isArray(table.diagram_columns) ? table.diagram_columns : [],
    },
    type: 'table',
});

const relationshipToEdge = (relationship, columnToTableId) => {
    const sourceTableId = columnToTableId.get(relationship.from_column_id);
    const targetTableId = columnToTableId.get(relationship.to_column_id);

    if (!sourceTableId || !targetTableId) {
        return null;
    }

    return {
        id: String(relationship.id),
        source: String(sourceTableId),
        target: String(targetTableId),
        sourceHandle: String(relationship.from_column_id),
        targetHandle: String(relationship.to_column_id),
        type: 'smoothstep',
        animated: relationship.type === 'many_to_many',
        label: relationship.type,
        style: {
            stroke: '#4f46e5',
            strokeWidth: 2,
        },
        labelStyle: {
            fill: '#312e81',
            fontWeight: 600,
            fontSize: 11,
        },
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#4f46e5',
            width: 18,
            height: 18,
        },
        data: relationship,
    };
};

export default function Editor({ diagramId }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveState, setSaveState] = useState('saved');
    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
    const [hasSavedViewport, setHasSavedViewport] = useState(false);

    const positionSaveTimersRef = useRef(new Map());
    const viewportSaveTimerRef = useRef(null);

    const resolvedDiagramId = useMemo(() => String(diagramId ?? ''), [diagramId]);

    const nodeTypes = useMemo(() => ({ table: TableNode }), []);

    const loadDiagram = useCallback(async () => {
        if (!resolvedDiagramId) {
            setError('A diagram id is required to load the editor.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data } = await window.axios.get(`${API_PREFIX}/diagrams/${resolvedDiagramId}`);
            const tables = Array.isArray(data?.diagram_tables) ? data.diagram_tables : [];
            const relationships = Array.isArray(data?.diagram_relationships) ? data.diagram_relationships : [];

            const columnToTableId = new Map();
            tables.forEach((table) => {
                (table.diagram_columns ?? []).forEach((column) => {
                    columnToTableId.set(column.id, table.id);
                });
            });

            setNodes(tables.map(tableToNode));
            setEdges(
                relationships
                    .map((relationship) => relationshipToEdge(relationship, columnToTableId))
                    .filter(Boolean)
            );

            if (data?.viewport) {
                setViewport({
                    x: Number(data.viewport.x ?? 0),
                    y: Number(data.viewport.y ?? 0),
                    zoom: Number(data.viewport.zoom ?? 1),
                });
                setHasSavedViewport(true);
            } else {
                setViewport({ x: 0, y: 0, zoom: 1 });
                setHasSavedViewport(false);
            }
        } catch (fetchError) {
            setError(fetchError?.response?.data?.message ?? 'Unable to load diagram data.');
        } finally {
            setLoading(false);
        }
    }, [resolvedDiagramId, setEdges, setNodes]);

    useEffect(() => {
        loadDiagram();
    }, [loadDiagram]);

    useEffect(
        () => () => {
            positionSaveTimersRef.current.forEach((timerId) => {
                window.clearTimeout(timerId);
            });

            if (viewportSaveTimerRef.current) {
                window.clearTimeout(viewportSaveTimerRef.current);
            }
        },
        []
    );

    const persistTablePosition = useCallback(async (node) => {
        try {
            setSaveState('saving');
            await window.axios.patch(`${API_PREFIX}/diagram-tables/${node.id}`, {
                x: Math.round(node.position.x),
                y: Math.round(node.position.y),
            });
            setSaveState('saved');
        } catch (_updateError) {
            setSaveState('error');
            // Keep canvas responsive even if persistence fails.
        }
    }, []);

    const onNodeDragStop = useCallback(
        (_event, node) => {
            const existingTimer = positionSaveTimersRef.current.get(node.id);

            if (existingTimer) {
                window.clearTimeout(existingTimer);
            }

            setSaveState('saving');

            const timerId = window.setTimeout(() => {
                positionSaveTimersRef.current.delete(node.id);
                persistTablePosition(node);
            }, 450);

            positionSaveTimersRef.current.set(node.id, timerId);
        },
        [persistTablePosition]
    );

    const onMoveEnd = useCallback(
        (_event, nextViewport) => {
            if (!resolvedDiagramId || !nextViewport) {
                return;
            }

            setViewport(nextViewport);

            if (viewportSaveTimerRef.current) {
                window.clearTimeout(viewportSaveTimerRef.current);
            }

            setSaveState('saving');

            viewportSaveTimerRef.current = window.setTimeout(async () => {
                try {
                    await window.axios.patch(`${API_PREFIX}/diagrams/${resolvedDiagramId}`, {
                        viewport: {
                            x: Number(nextViewport.x),
                            y: Number(nextViewport.y),
                            zoom: Number(nextViewport.zoom),
                        },
                    });
                    setSaveState('saved');
                } catch (_saveError) {
                    setSaveState('error');
                }
            }, 450);
        },
        [resolvedDiagramId]
    );

    const onConnect = useCallback(
        async (connection) => {
            const { source, target, sourceHandle, targetHandle } = connection;

            if (!source || !target || !sourceHandle || !targetHandle || !resolvedDiagramId) {
                return;
            }

            const tempEdgeId = `temp-${sourceHandle}-${targetHandle}-${Date.now()}`;
            const optimisticEdge = {
                id: tempEdgeId,
                source,
                target,
                sourceHandle,
                targetHandle,
                type: 'smoothstep',
                label: 'one_to_many',
                animated: false,
                style: {
                    stroke: '#4f46e5',
                    strokeWidth: 2,
                },
                labelStyle: {
                    fill: '#312e81',
                    fontWeight: 600,
                    fontSize: 11,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#4f46e5',
                    width: 18,
                    height: 18,
                },
            };

            setEdges((existingEdges) => addEdge(optimisticEdge, existingEdges));

            try {
                const payload = {
                    diagram_id: Number(resolvedDiagramId),
                    from_column_id: Number(sourceHandle),
                    to_column_id: Number(targetHandle),
                    type: 'one_to_many',
                };

                const { data } = await window.axios.post(`${API_PREFIX}/diagram-relationships`, payload);

                setEdges((existingEdges) =>
                    existingEdges.map((edge) => {
                        if (edge.id !== tempEdgeId) {
                            return edge;
                        }

                        return {
                            ...edge,
                            id: String(data?.id ?? edge.id),
                            label: data?.type ?? edge.label,
                            animated: (data?.type ?? edge.label) === 'many_to_many',
                            data,
                        };
                    })
                );
            } catch (_storeError) {
                setEdges((existingEdges) => existingEdges.filter((edge) => edge.id !== tempEdgeId));
            }
        },
        [resolvedDiagramId, setEdges]
    );

    return (
        <AuthenticatedLayout>
            <Head title="Diagram Editor" />

            <div className="rounded-xl border bg-white p-4 shadow-sm">
                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="h-[70vh] w-full rounded-lg border">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500">
                            Loading diagram...
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeDragStop={onNodeDragStop}
                            onMoveEnd={onMoveEnd}
                            nodeTypes={nodeTypes}
                            defaultViewport={viewport}
                            fitView={!hasSavedViewport}
                            nodesDraggable
                            nodesConnectable
                            elementsSelectable
                            panOnDrag
                            zoomOnScroll
                            zoomOnPinch
                            zoomOnDoubleClick
                        >
                            <MiniMap pannable zoomable />
                            <Controls showInteractive={false} />
                            <Background gap={16} size={1} />
                        </ReactFlow>
                    )}
                </div>

                <div className="mt-3 flex justify-end">
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                            saveState === 'saving'
                                ? 'bg-amber-100 text-amber-800'
                                : saveState === 'error'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-emerald-100 text-emerald-700'
                        }`}
                    >
                        {saveState === 'saving'
                            ? 'Saving…'
                            : saveState === 'error'
                              ? 'Save failed'
                              : 'All changes saved'}
                    </span>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
