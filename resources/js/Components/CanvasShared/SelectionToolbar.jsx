export default function SelectionToolbar({
    selectedNode,
    selectedDoodle,
    onUpdateNode,
    onDeleteNode,
    onUpdateDoodle,
    onDeleteDoodle,
}) {
    if (!selectedNode && !selectedDoodle) return null;

    if (selectedDoodle) {
        return (
            <div className="absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
                <input type="color" value={selectedDoodle.color ?? '#0f172a'} onChange={(event) => onUpdateDoodle({ color: event.target.value })} className="h-8 w-8 rounded" title="Stroke color" />
                <select value={selectedDoodle.strokeWidth ?? 2.5} onChange={(event) => onUpdateDoodle({ strokeWidth: Number(event.target.value) })} className="rounded border border-slate-300 px-2 py-1 text-xs">
                    <option value={2}>2px</option>
                    <option value={4}>4px</option>
                    <option value={6}>6px</option>
                </select>
                <button type="button" onClick={onDeleteDoodle} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600">Delete</button>
            </div>
        );
    }

    const data = selectedNode?.data ?? {};
    const isMind = selectedNode?.type === 'mindTopic';

    return (
        <div className="absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
            {isMind ? (
                <input
                    type="color"
                    value={data.branchColor ?? '#64748b'}
                    onChange={(event) => onUpdateNode({ branchColor: event.target.value })}
                    title="Branch color"
                    className="h-8 w-8 rounded"
                />
            ) : (
                <>
                    <input type="color" value={data.fillColor ?? data.fill ?? '#ffffff'} onChange={(event) => onUpdateNode({ fillColor: event.target.value, fill: event.target.value })} title="Fill" className="h-8 w-8 rounded" />
                    <input type="color" value={data.borderColor ?? data.stroke ?? '#334155'} onChange={(event) => onUpdateNode({ borderColor: event.target.value, stroke: event.target.value })} title="Border" className="h-8 w-8 rounded" />
                    <button type="button" onClick={() => onUpdateNode({ borderStyle: (data.borderStyle ?? 'solid') === 'solid' ? 'dashed' : 'solid' })} className="rounded border border-slate-300 px-2 py-1 text-xs">
                        {(data.borderStyle ?? 'solid') === 'solid' ? 'Solid' : 'Dashed'}
                    </button>
                    <select value={data.textSize ?? data.fontSize ?? 'md'} onChange={(event) => onUpdateNode({ textSize: event.target.value, fontSize: event.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs">
                        <option value="sm">S</option>
                        <option value="md">M</option>
                        <option value="lg">L</option>
                    </select>
                </>
            )}
            <button type="button" onClick={onDeleteNode} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600">Delete</button>
        </div>
    );
}
