const addButtonClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50';

export default function FlowSidebar({
    isCollapsed,
    onToggleCollapse,
    onAddNode,
    selectedNode,
    onUpdateNode,
    onFocusNode,
    nodes,
    editMode,
}) {
    if (isCollapsed) {
        return <button type="button" onClick={onToggleCollapse} className="m-3 rounded-md border bg-white px-2 py-1 text-xs">→</button>;
    }

    return (
        <aside className="w-72 border-r border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Flowchart</h3>
                <button type="button" onClick={onToggleCollapse} className="text-xs text-slate-500">Collapse</button>
            </div>
            <div className="space-y-2">
                <button type="button" className={addButtonClass} onClick={() => onAddNode('rectangle')}>+ Rectangle</button>
                <button type="button" className={addButtonClass} onClick={() => onAddNode('diamond')}>+ Diamond</button>
                <button type="button" className={addButtonClass} onClick={() => onAddNode('text')}>+ Text</button>
                <button type="button" className={addButtonClass} onClick={() => onAddNode('sticky')}>+ Sticky</button>
                <button type="button" className={addButtonClass} onClick={() => onAddNode('group')}>+ Group</button>
            </div>

            {selectedNode && (
                <div className="mt-4 space-y-2 rounded-lg border border-slate-200 p-3">
                    <h4 className="text-xs font-semibold uppercase text-slate-500">Inspector</h4>
                    <input value={selectedNode.data?.text ?? ''} disabled={!editMode} onChange={(e) => onUpdateNode(selectedNode.id, { text: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                    <label className="block text-xs text-slate-500">Fill</label>
                    <input type="color" disabled={!editMode} value={selectedNode.data?.fillColor ?? '#ffffff'} onChange={(e) => onUpdateNode(selectedNode.id, { fillColor: e.target.value })} className="h-9 w-full" />
                    <label className="block text-xs text-slate-500">Border</label>
                    <input type="color" disabled={!editMode} value={selectedNode.data?.borderColor ?? '#334155'} onChange={(e) => onUpdateNode(selectedNode.id, { borderColor: e.target.value })} className="h-9 w-full" />
                </div>
            )}

            <div className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Layers</h4>
                <div className="max-h-48 space-y-1 overflow-auto">
                    {nodes.map((node) => (
                        <button key={node.id} type="button" onClick={() => onFocusNode(node.id)} className="w-full truncate rounded-md border border-slate-200 px-2 py-1 text-left text-xs hover:bg-slate-50">
                            {node.data?.text || node.id}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}
