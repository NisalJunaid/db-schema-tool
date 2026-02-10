import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

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
    type: 'default',
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
        data: relationship,
    };
};

export default function Editor({ diagramId }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const resolvedDiagramId = useMemo(() => String(diagramId ?? ''), [diagramId]);

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
                            onNodeDragStop={onNodeDragStop}
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
