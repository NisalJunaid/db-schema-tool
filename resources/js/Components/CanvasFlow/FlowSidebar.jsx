export default function FlowSidebar({ isCollapsed, onToggleCollapse, nodes, selectedNode, onUpdateNode, editMode }) {
    if (isCollapsed) return <button type="button" onClick={onToggleCollapse} className="m-3 rounded-md border bg-white px-2 py-1 text-xs">→</button>;

    return (
        <aside className="w-72 border-r border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Layers / Inspect</h3>
                <button type="button" onClick={onToggleCollapse} className="text-xs text-slate-500">Collapse</button>
            </div>

            <div className="max-h-64 overflow-auto rounded-md border border-slate-200 py-1">
                {nodes.map((node) => (
                    <div key={node.id} className="truncate px-2 py-1 text-xs text-slate-700">{node.data?.label ?? node.data?.text ?? node.id}</div>
                ))}
            </div>

            {selectedNode && (
                <div className="mt-4 space-y-2 rounded-lg border border-slate-200 p-3">
                    <label className="text-xs text-slate-600">Label</label>
                    <input
                        value={selectedNode.data?.label ?? selectedNode.data?.text ?? ''}
                        disabled={!editMode}
                        onChange={(event) => onUpdateNode(selectedNode.id, { label: event.target.value, text: event.target.value })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <label className="text-xs text-slate-600">Fill</label>
                    <input type="color" value={selectedNode.data?.fill ?? '#ffffff'} disabled={!editMode} onChange={(event) => onUpdateNode(selectedNode.id, { fill: event.target.value })} className="h-9 w-full" />
                    <label className="text-xs text-slate-600">Stroke</label>
                    <input type="color" value={selectedNode.data?.stroke ?? '#475569'} disabled={!editMode} onChange={(event) => onUpdateNode(selectedNode.id, { stroke: event.target.value })} className="h-9 w-full" />
                </div>
            )}
        </aside>
    );
}
