export default function SelectionInspector({ mode, selectedNode, selectedEdge, onUpdateNode, onUpdateEdge, onDelete }) {
    if (!selectedNode && !selectedEdge) return null;

    const node = selectedNode;
    const edge = selectedEdge;

    return (
        <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
            {node && node.type !== 'inkNode' && mode === 'flow' && (
                <>
                    <input type="color" value={node?.data?.fill ?? node?.data?.fillColor ?? '#ffffff'} onChange={(e) => onUpdateNode?.({ fill: e.target.value, fillColor: e.target.value })} title="Fill" className="h-8 w-8" />
                    <input type="color" value={node?.data?.stroke ?? node?.data?.borderColor ?? '#334155'} onChange={(e) => onUpdateNode?.({ stroke: e.target.value, borderColor: e.target.value })} title="Border" className="h-8 w-8" />
                    <button type="button" onClick={() => onUpdateNode?.({ borderStyle: (node?.data?.borderStyle ?? 'solid') === 'solid' ? 'dashed' : 'solid' })} className="rounded border border-slate-300 px-2 py-1 text-xs">Dashed</button>
                </>
            )}
            {node && node.type !== 'inkNode' && mode === 'mind' && (
                <>
                    <input type="color" value={node?.data?.branchColor ?? '#64748b'} onChange={(e) => onUpdateNode?.({ branchColor: e.target.value })} title="Branch color" className="h-8 w-8" />
                </>
            )}
            {node?.type === 'inkNode' && (
                <>
                    <input type="color" value={node?.data?.color ?? '#0f172a'} onChange={(e) => onUpdateNode?.({ color: e.target.value })} className="h-8 w-8" />
                    <input type="range" min="1" max="8" value={node?.data?.strokeWidth ?? 2.5} onChange={(e) => onUpdateNode?.({ strokeWidth: Number(e.target.value) })} />
                </>
            )}
            {edge && (
                <>
                    <input type="color" value={edge?.style?.stroke ?? '#64748b'} onChange={(e) => onUpdateEdge?.({ style: { ...(edge.style ?? {}), stroke: e.target.value } })} className="h-8 w-8" />
                    <input type="text" value={edge?.label ?? ''} onChange={(e) => onUpdateEdge?.({ label: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs" placeholder="Label" />
                </>
            )}
            <button type="button" onClick={onDelete} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600">Delete</button>
        </div>
    );
}
