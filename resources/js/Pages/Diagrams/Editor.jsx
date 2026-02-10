import { Head, usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
    {
        id: 'demo-table-users',
        type: 'default',
        position: { x: 120, y: 100 },
        data: {
            label: (
                <div className="space-y-1">
                    <p className="font-semibold">users</p>
                    <p className="text-xs text-slate-500">id, email, created_at</p>
                </div>
            ),
        },
    },
];

const initialEdges = [];

export default function DiagramEditor() {
    const { diagramId } = usePage().props;
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params) => setEdges((currentEdges) => addEdge({ ...params, animated: true }, currentEdges)),
        [setEdges],
    );

    return (
        <>
            <Head title={`Diagram ${diagramId}`} />

            <section className="flex h-screen flex-col gap-4">
                <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3 shadow-sm">
                    <h1 className="text-lg font-semibold text-slate-900">Diagram Editor</h1>
                    <p className="text-sm text-slate-600">
                        Diagram ID: <span className="font-semibold text-indigo-700">{diagramId}</span>
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        fitView
                        className="h-full w-full"
                    >
                        <MiniMap />
                        <Controls />
                        <Background gap={16} size={1} />
                    </ReactFlow>
                </div>
            </section>
        </>
    );
}
