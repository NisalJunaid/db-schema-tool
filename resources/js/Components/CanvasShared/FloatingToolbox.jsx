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

export default function FloatingToolbox({ mode, tool, setTool }) {
    if (!['flow', 'mind'].includes(mode)) return null;

    return (
        <div className="absolute left-3 top-[90px] z-40 flex w-14 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
            {tools.map((item) => (
                <ToolButton key={item.key} active={tool === item.key} icon={item.icon} title={item.title} onClick={() => setTool(item.key)} />
            ))}
        </div>
    );
}
