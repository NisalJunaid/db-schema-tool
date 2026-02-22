import { Head, router, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { Background, MiniMap, ReactFlow, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import TableNode from '@/Components/Diagram/TableNode';
import { asCollection, computeTableDimensions, toColumnHandleId } from '@/Components/Diagram/utils';

const nodeTypes = { tableNode: TableNode };

function SharedCanvasContent() {
    const { diagram, permissions = {}, status = 'active', auth = {} } = usePage().props;
    const authUser = auth?.user ?? null;
    const canEdit = Boolean(permissions?.canEdit);

    const tableList = useMemo(() => asCollection(diagram?.diagram_tables, 'diagram_tables').map((table) => ({
        ...table,
        columns: asCollection(table?.diagram_columns ?? table?.columns, 'diagram_columns'),
    })), [diagram?.diagram_tables]);

    const columnToTableMap = useMemo(() => {
        const map = {};
        tableList.forEach((table) => (table.columns ?? []).forEach((column) => {
            map[column.id] = table.id;
        }));
        return map;
    }, [tableList]);

    const tableXMap = useMemo(() => tableList.reduce((map, table) => {
        map[String(table.id)] = Number.isFinite(Number(table?.x)) ? Number(table.x) : 0;
        return map;
    }, {}), [tableList]);

    const relationships = useMemo(() => asCollection(diagram?.diagram_relationships, 'diagram_relationships'), [diagram?.diagram_relationships]);

    const nodes = useMemo(() => tableList.map((table) => {
        const computedDimensions = computeTableDimensions(table);
        const rawWidth = Number(table?.w ?? computedDimensions.width ?? 320);
        const width = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 320;

        return {
            id: String(table.id),
            type: 'tableNode',
            draggable: false,
            position: {
                x: Number.isFinite(Number(table?.x)) ? Number(table.x) : 0,
                y: Number.isFinite(Number(table?.y)) ? Number(table.y) : 0,
            },
            data: {
                table,
                editMode: false,
                selectedColumnId: null,
                tableXById: tableXMap,
                columnToTableMap,
                relationships,
            },
            style: { width, zIndex: 10 },
        };
    }), [columnToTableMap, relationships, tableList, tableXMap]);

    const edges = useMemo(() => relationships.map((relationship) => {
        const sourceTableId = columnToTableMap[relationship.from_column_id];
        const targetTableId = columnToTableMap[relationship.to_column_id];
        if (!sourceTableId || !targetTableId) return null;

        return {
            id: String(relationship.id),
            source: String(sourceTableId),
            target: String(targetTableId),
            sourceHandle: toColumnHandleId(relationship.from_column_id, 'out'),
            targetHandle: toColumnHandleId(relationship.to_column_id, 'in'),
            label: relationship.type === 'one_to_one' ? '1:1' : '1:N',
            type: 'smoothstep',
            animated: false,
        };
    }).filter(Boolean), [columnToTableMap, relationships]);

    const statusTitle = status === 'expired' ? 'Link expired' : 'Link revoked';

    return (
        <>
            <Head title={diagram?.name ? `Shared: ${diagram.name}` : 'Shared diagram'} />
            <div className="flex h-screen flex-col bg-slate-100">
                <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <img src="/images/logo.png" alt="Forge" className="h-7 w-auto" />
                        <span>Shared diagram view</span>
                    </div>
                    <div className="truncate text-sm font-semibold text-slate-800">{diagram?.name ?? statusTitle}</div>
                    <div className="flex items-center gap-2">
                        {!authUser && status === 'active' && (
                            <button
                                type="button"
                                onClick={() => router.visit(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                                className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                            >
                                Log in
                            </button>
                        )}
                        {authUser && canEdit && status === 'active' && (
                            <button type="button" onClick={() => router.visit(`/diagrams/${diagram.id}`)} className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">Open in Editor</button>
                        )}
                        {authUser && !canEdit && status === 'active' && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">View only</span>}
                    </div>
                </header>

                {status !== 'active' ? (
                    <div className="flex flex-1 items-center justify-center p-6">
                        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                            <h1 className="text-xl font-semibold text-slate-900">{statusTitle}</h1>
                            <p className="mt-2 text-sm text-slate-600">This shared link is no longer available. Request access from the owner.</p>
                            <div className="mt-5">
                                <button type="button" onClick={() => router.visit('/login')} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Log in</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative min-h-0 flex-1">
                        {!authUser && (
                            <div className="absolute left-4 top-4 z-20 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow">
                                Log in to access edit mode.
                            </div>
                        )}
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            zoomOnPinch
                            zoomOnScroll
                            panOnScroll
                            panOnDrag
                            fitView
                            onInit={(instance) => {
                                if (diagram?.viewport) {
                                    instance.setViewport(diagram.viewport, { duration: 0 });
                                }
                            }}
                        >
                            <MiniMap pannable zoomable />
                            <Background gap={20} />
                        </ReactFlow>
                    </div>
                )}
            </div>
        </>
    );
}

export default function SharedCanvas() {
    return (
        <ReactFlowProvider>
            <SharedCanvasContent />
        </ReactFlowProvider>
    );
}

SharedCanvas.layout = (page) => page;
