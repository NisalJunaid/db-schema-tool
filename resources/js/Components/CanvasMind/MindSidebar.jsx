function TreeRow({ node, depth, onFocusNode }) {
    return (
        <button type="button" onClick={() => onFocusNode(node.id)} className="w-full truncate rounded-md px-2 py-1 text-left text-xs hover:bg-slate-100" style={{ paddingLeft: `${depth * 14 + 8}px` }}>
            {node.data?.text}
        </button>
    );
}

export default function MindSidebar({
    isCollapsed,
    onToggleCollapse,
    nodes,
    selectedNode,
    onAddRoot,
    onAddChild,
    onDeleteNode,
    onUpdateNode,
    onFocusNode,
    editMode,
}) {
    if (isCollapsed) {
        return <button type="button" onClick={onToggleCollapse} className="m-3 rounded-md border bg-white px-2 py-1 text-xs">→</button>;
    }

    const roots = nodes.filter((node) => !node.data?.parentId);
    const buildTree = (parentId = null, depth = 0) => nodes
        .filter((node) => (node.data?.parentId ?? null) === parentId)
        .flatMap((node) => [<TreeRow key={node.id} node={node} depth={depth} onFocusNode={onFocusNode} />, ...buildTree(node.id, depth + 1)]);

    return (
        <aside className="w-72 border-r border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Mind Map</h3>
                <button type="button" onClick={onToggleCollapse} className="text-xs text-slate-500">Collapse</button>
            </div>

            <p className="mb-3 text-[11px] text-slate-500">Shortcuts: Tab child, Enter sibling, Shift+Tab parent.</p>
            <div className="space-y-2">
                {!roots.length && <button type="button" onClick={onAddRoot} className="w-full rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">+ Add root</button>}
                <button type="button" onClick={onAddChild} disabled={!selectedNode || !editMode} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">+ Add child</button>
                <button type="button" onClick={onDeleteNode} disabled={!selectedNode || !editMode} className="w-full rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40">Delete node</button>
            </div>

            {selectedNode && (
                <div className="mt-4 space-y-2 rounded-lg border border-slate-200 p-3">
                    <input value={selectedNode.data?.text ?? ''} disabled={!editMode} onChange={(e) => onUpdateNode(selectedNode.id, { text: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                    <input type="color" value={selectedNode.data?.branchColor ?? '#334155'} disabled={!editMode} onChange={(e) => onUpdateNode(selectedNode.id, { branchColor: e.target.value })} className="h-9 w-full" />
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={Boolean(selectedNode.data?.collapsed)} disabled={!editMode} onChange={(e) => onUpdateNode(selectedNode.id, { collapsed: e.target.checked })} />
                        Collapse children
                    </label>
                </div>
            )}

            <div className="mt-4 max-h-64 overflow-auto rounded-md border border-slate-200 py-1">
                {buildTree()}
            </div>
        </aside>
    );
}
