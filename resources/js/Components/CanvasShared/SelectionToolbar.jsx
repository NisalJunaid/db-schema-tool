export default function SelectionToolbar({ node, onUpdate, onDelete }) {
    if (!node) return null;

    const data = node.data ?? {};

    return (
        <div className="absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <input
                type="color"
                value={data.fillColor ?? data.fill ?? '#ffffff'}
                onChange={(event) => onUpdate({ fillColor: event.target.value, fill: event.target.value })}
                title="Fill"
                className="h-8 w-8 rounded"
            />
            <input
                type="color"
                value={data.borderColor ?? data.stroke ?? '#334155'}
                onChange={(event) => onUpdate({ borderColor: event.target.value, stroke: event.target.value })}
                title="Border"
                className="h-8 w-8 rounded"
            />
            <button
                type="button"
                onClick={() => onUpdate({ borderStyle: (data.borderStyle ?? 'solid') === 'solid' ? 'dashed' : 'solid' })}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
                {(data.borderStyle ?? 'solid') === 'solid' ? 'Solid' : 'Dashed'}
            </button>
            <select
                value={data.textSize ?? data.fontSize ?? 'md'}
                onChange={(event) => onUpdate({ textSize: event.target.value, fontSize: event.target.value })}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
                <option value="sm">S</option>
                <option value="md">M</option>
                <option value="lg">L</option>
            </select>
            <button type="button" onClick={onDelete} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600">Delete</button>
        </div>
    );
}
