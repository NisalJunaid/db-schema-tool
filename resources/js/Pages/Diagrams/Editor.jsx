import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
        } catch (fetchError) {
            setError(fetchError?.response?.data?.message ?? 'Unable to load diagram data.');
        } finally {
            setLoading(false);
        }
    }, [resolvedDiagramId, setEdges, setNodes]);

    useEffect(() => {
        loadDiagram();
    }, [loadDiagram]);

    const onNodeDragStop = useCallback(async (_event, node) => {
        try {
            await window.axios.patch(`${API_PREFIX}/diagram-tables/${node.id}`, {
                x: Math.round(node.position.x),
                y: Math.round(node.position.y),
            });
        } catch (_updateError) {
            // Keep canvas responsive even if persistence fails.
        }
    }, []);

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
                            nodeTypes={nodeTypes}
                            fitView
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
            </div>
        </AuthenticatedLayout>
    );
}
