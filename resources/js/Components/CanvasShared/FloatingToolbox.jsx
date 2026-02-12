const tools = [
    { key: 'select', icon: 'fa-solid fa-arrow-pointer', title: 'Select' },
    { key: 'hand', icon: 'fa-regular fa-hand', title: 'Pan / Hand' },
    { key: 'rect', icon: 'fa-regular fa-square', title: 'Rectangle' },
    { key: 'roundRect', icon: 'fa-regular fa-square-full', title: 'Rounded Rectangle' },
    { key: 'diamond', icon: 'fa-regular fa-gem', title: 'Diamond' },
    { key: 'ellipse', icon: 'fa-regular fa-circle', title: 'Ellipse' },
    { key: 'sticky', icon: 'fa-solid fa-note-sticky', title: 'Sticky Note' },
    { key: 'text', icon: 'fa-solid fa-font', title: 'Text' },
    { key: 'connector', icon: 'fa-solid fa-arrow-right-long', title: 'Connector' },
    { key: 'pen', icon: 'fa-solid fa-pen', title: 'Pen' },
];

function ToolButton({ active, icon, title, onClick }) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition ${active ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-transparent text-slate-700 hover:bg-slate-100'}`}
        >
            <i className={icon} aria-hidden="true" />
            <span className="sr-only">{title}</span>
        </button>
    );
}

export default function FloatingToolbox({
    mode,
    tool,
    setTool,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    textSize,
    setTextSize,
    borderStyle,
    setBorderStyle,
    doodlesVisible,
    setDoodlesVisible,
}) {
    if (!['flow', 'mind'].includes(mode)) return null;

    return (
        <div className="absolute left-3 top-[90px] z-40 flex w-14 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
            {tools.map((item) => (
                <ToolButton key={item.key} active={tool === item.key} icon={item.icon} title={item.title} onClick={() => setTool(item.key)} />
            ))}

            <div className="mt-1 w-full border-t border-slate-200 pt-2">
                <label className="mb-1 block text-[10px] text-slate-500">Fill</label>
                <input type="color" value={fillColor} onChange={(event) => setFillColor(event.target.value)} className="mb-2 h-7 w-full rounded" />
                <label className="mb-1 block text-[10px] text-slate-500">Stroke</label>
                <input type="color" value={strokeColor} onChange={(event) => setStrokeColor(event.target.value)} className="mb-2 h-7 w-full rounded" />
                <select value={textSize} onChange={(event) => setTextSize(event.target.value)} className="mb-2 w-full rounded border border-slate-200 px-1 py-1 text-[11px]">
                    <option value="sm">Text S</option>
                    <option value="md">Text M</option>
                    <option value="lg">Text L</option>
                </select>
                <button type="button" onClick={() => setBorderStyle(borderStyle === 'solid' ? 'dashed' : 'solid')} className="mb-2 w-full rounded border border-slate-200 px-1 py-1 text-[11px]">
                    {borderStyle === 'solid' ? 'Solid' : 'Dashed'}
                </button>
                <button type="button" onClick={() => setDoodlesVisible((current) => !current)} className="w-full rounded border border-slate-200 px-1 py-1 text-[11px]">
                    {doodlesVisible ? 'Hide ink' : 'Show ink'}
                </button>
            </div>
        </div>
    );
}
