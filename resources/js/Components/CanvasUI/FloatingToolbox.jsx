const flowTools = [
    { key: 'select', icon: 'fa-solid fa-arrow-pointer', title: 'Select' },
    { key: 'pan', icon: 'fa-regular fa-hand', title: 'Pan' },
    { key: 'connector', icon: 'fa-solid fa-arrow-right-long', title: 'Connector' },
    { key: 'rect', icon: 'fa-regular fa-square', title: 'Rectangle' },
    { key: 'rounded', icon: 'fa-regular fa-square-full', title: 'Rounded Rectangle' },
    { key: 'diamond', icon: 'fa-regular fa-gem', title: 'Diamond' },
    { key: 'circle', icon: 'fa-regular fa-circle', title: 'Circle' },
    { key: 'text', icon: 'fa-solid fa-font', title: 'Text' },
    { key: 'sticky', icon: 'fa-solid fa-note-sticky', title: 'Sticky' },
    { key: 'pen', icon: 'fa-solid fa-pen', title: 'Pen' },
];

const mindTools = [
    { key: 'select', icon: 'fa-solid fa-arrow-pointer', title: 'Select' },
    { key: 'pan', icon: 'fa-regular fa-hand', title: 'Pan' },
    { key: 'topic', icon: 'fa-solid fa-circle-plus', title: 'Add Topic' },
    { key: 'child', icon: 'fa-solid fa-diagram-next', title: 'Add Subtopic' },
    { key: 'connector', icon: 'fa-solid fa-arrow-right-long', title: 'Connector' },
    { key: 'pen', icon: 'fa-solid fa-pen', title: 'Pen' },
    { key: 'toggle-ink', icon: 'fa-solid fa-eye', title: 'Toggle ink' },
];

export default function FloatingToolbox({ mode, activeTool, onSelectTool, showInk = true, onToggleInk, editMode = false }) {
    if (!['flow', 'mind'].includes(mode)) return null;

    const tools = mode === 'flow'
        ? [...flowTools, { key: 'toggle-ink', icon: showInk ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash', title: 'Toggle ink' }]
        : mindTools.map((tool) => (tool.key === 'toggle-ink' ? { ...tool, icon: showInk ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash' } : tool));

    return (
        <div className="pointer-events-auto absolute left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg">
            {tools.map((tool) => (
                <button
                    key={tool.key}
                    type="button"
                    title={tool.title}
                    disabled={!editMode && tool.key !== 'toggle-ink'}
                    onClick={() => (tool.key === 'toggle-ink' ? onToggleInk?.() : onSelectTool?.(tool.key))}
                    className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-md border ${activeTool === tool.key ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-transparent text-slate-700 hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                    <i className={tool.icon} />
                </button>
            ))}
        </div>
    );
}
