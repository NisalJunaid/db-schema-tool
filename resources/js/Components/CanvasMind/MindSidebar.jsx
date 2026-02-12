import { useMemo, useState } from 'react';

function TreeRow({ node, depth, onFocusNode }) {
    return (
        <button type="button" onClick={() => onFocusNode(node.id)} className="w-full truncate rounded-md px-2 py-1 text-left text-xs hover:bg-slate-100" style={{ paddingLeft: `${depth * 14 + 8}px` }}>
            {node.data?.label ?? node.data?.text}
        </button>
    );
}

export default function MindSidebar({ isCollapsed, onToggleCollapse, nodes, selectedNode, onUpdateNode, onFocusNode, editMode }) {
    const [query, setQuery] = useState('');
    if (isCollapsed) return <button type="button" onClick={onToggleCollapse} className="m-3 rounded-md border bg-white px-2 py-1 text-xs">→</button>;

    const filtered = useMemo(() => nodes.filter((node) => (node.data?.text ?? '').toLowerCase().includes(query.toLowerCase())), [nodes, query]);
    const buildTree = (parentId = null, depth = 0) => filtered
        .filter((node) => (node.data?.parentId ?? null) === parentId)
        .flatMap((node) => [<TreeRow key={node.id} node={node} depth={depth} onFocusNode={onFocusNode} />, ...buildTree(node.id, depth + 1)]);

    return (
        <aside className="w-72 border-r border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Outline / Inspect</h3>
                <button type="button" onClick={onToggleCollapse} className="text-xs text-slate-500">Collapse</button>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nodes" className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-xs" />

            {selectedNode && (
                <div className="mb-3 space-y-2 rounded-lg border border-slate-200 p-3">
                    <input value={selectedNode.data?.label ?? selectedNode.data?.text ?? ''} disabled={!editMode} onChange={(event) => onUpdateNode(selectedNode.id, { label: event.target.value, text: event.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" checked={Boolean(selectedNode.data?.collapsed)} disabled={!editMode} onChange={(event) => onUpdateNode(selectedNode.id, { collapsed: event.target.checked })} />
                        Collapse children
                    </label>
                </div>
            )}

            <div className="max-h-72 overflow-auto rounded-md border border-slate-200 py-1">{buildTree()}</div>
        </aside>
    );
}
