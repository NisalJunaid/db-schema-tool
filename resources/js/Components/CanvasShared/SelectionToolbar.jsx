export default function SelectionToolbar({
    editorMode,
    position,
    selectedNode,
    selectedEdge,
    editMode,
    onUpdateNode,
    onUpdateEdge,
    onDelete,
    onToggleCollapse,
    onBringForward,
    onSendBackward,
}) {
    if (!position || (!selectedNode && !selectedEdge) || editorMode === 'db') return null;

    return (
        <div
            className="absolute z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-2 py-1 shadow-lg backdrop-blur"
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
            {selectedNode && editorMode === 'flow' && (
                <>
                    <input type="color" disabled={!editMode} value={selectedNode.data?.fillColor ?? '#ffffff'} onChange={(e) => onUpdateNode(selectedNode.id, { fillColor: e.target.value })} title="Fill" className="h-7 w-7 rounded" />
                    <input type="color" disabled={!editMode} value={selectedNode.data?.borderColor ?? '#334155'} onChange={(e) => onUpdateNode(selectedNode.id, { borderColor: e.target.value })} title="Border" className="h-7 w-7 rounded" />
                    <select disabled={!editMode} value={selectedNode.data?.borderStyle ?? 'solid'} onChange={(e) => onUpdateNode(selectedNode.id, { borderStyle: e.target.value })} className="h-7 rounded border border-slate-300 px-1 text-xs">
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                    </select>
                    <select disabled={!editMode} value={selectedNode.data?.textAlign ?? 'center'} onChange={(e) => onUpdateNode(selectedNode.id, { textAlign: e.target.value })} className="h-7 rounded border border-slate-300 px-1 text-xs">
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                    </select>
                    <select disabled={!editMode} value={selectedNode.data?.fontSize ?? 'md'} onChange={(e) => onUpdateNode(selectedNode.id, { fontSize: e.target.value })} className="h-7 rounded border border-slate-300 px-1 text-xs">
                        <option value="sm">S</option>
                        <option value="md">M</option>
                        <option value="lg">L</option>
                    </select>
                    <button type="button" disabled={!editMode} onClick={onBringForward} className="h-7 rounded border border-slate-300 px-2 text-xs">↑</button>
                    <button type="button" disabled={!editMode} onClick={onSendBackward} className="h-7 rounded border border-slate-300 px-2 text-xs">↓</button>
                </>
            )}

            {selectedNode && editorMode === 'mind' && (
                <>
                    <input type="color" disabled={!editMode} value={selectedNode.data?.branchColor ?? '#334155'} onChange={(e) => onUpdateNode(selectedNode.id, { branchColor: e.target.value })} title="Branch color" className="h-7 w-7 rounded" />
                    <button type="button" disabled={!editMode} onClick={onToggleCollapse} className="h-7 rounded border border-slate-300 px-2 text-xs">
                        {selectedNode.data?.collapsed ? 'Expand' : 'Collapse'}
                    </button>
                </>
            )}

            {selectedEdge && (
                <>
                    <input
                        disabled={!editMode}
                        value={selectedEdge.label ?? ''}
                        onChange={(e) => onUpdateEdge(selectedEdge.id, { label: e.target.value })}
                        className="h-7 rounded border border-slate-300 px-2 text-xs"
                        placeholder="Edge label"
                    />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        disabled={!editMode}
                        value={selectedEdge.data?.curvature ?? 0.25}
                        onChange={(e) => onUpdateEdge(selectedEdge.id, { data: { ...selectedEdge.data, curvature: Number(e.target.value) } })}
                        title="Curve"
                    />
                </>
            )}

            <button type="button" disabled={!editMode} onClick={onDelete} className="h-7 rounded border border-rose-300 px-2 text-xs text-rose-600">Delete</button>
        </div>
    );
}
