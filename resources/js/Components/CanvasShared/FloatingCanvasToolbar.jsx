const baseButtonClass = 'group relative flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-slate-700 transition duration-150 hover:scale-105 hover:bg-slate-100';

function ToolButton({ title, icon, active = false, onClick }) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`${baseButtonClass} ${active ? 'animate-[bounce_0.25s_ease-in-out] bg-indigo-600 text-white shadow-sm hover:bg-indigo-600' : ''}`.trim()}
        >
            <i className={`${icon} text-sm`} aria-hidden="true" />
            <span className="sr-only">{title}</span>
        </button>
    );
}

export default function FloatingCanvasToolbar({
    editorMode,
    activeTool,
    setActiveTool,
    onAddNode,
    onAddChild,
    onAddSibling,
    onToggleMiniMap,
    showMiniMap,
}) {
    if (editorMode === 'db') return null;

    const flowTools = [
        { key: 'select', title: 'Select', icon: 'fa-solid fa-arrow-pointer' },
        { key: 'rect', title: 'Rectangle', icon: 'fa-regular fa-square', addType: 'rectangle' },
        { key: 'diamond', title: 'Diamond', icon: 'fa-regular fa-gem', addType: 'diamond' },
        { key: 'circle', title: 'Circle', icon: 'fa-regular fa-circle', addType: 'circle' },
        { key: 'text', title: 'Text', icon: 'fa-solid fa-font', addType: 'text' },
        { key: 'sticky', title: 'Sticky Note', icon: 'fa-solid fa-note-sticky', addType: 'sticky' },
        { key: 'connector', title: 'Arrow connector', icon: 'fa-solid fa-arrow-right-long' },
        { key: 'pan', title: 'Pan', icon: 'fa-regular fa-hand' },
    ];

    const mindTools = [
        { key: 'select', title: 'Select', icon: 'fa-solid fa-arrow-pointer' },
        { key: 'child', title: 'Add child', icon: 'fa-solid fa-code-branch', onClick: onAddChild },
        { key: 'sibling', title: 'Add sibling', icon: 'fa-solid fa-share-nodes', onClick: onAddSibling },
        { key: 'topic', title: 'Add floating topic', icon: 'fa-solid fa-lightbulb' },
        { key: 'pan', title: 'Pan', icon: 'fa-regular fa-hand' },
    ];

    const tools = editorMode === 'flow' ? flowTools : mindTools;

    return (
        <div className="pointer-events-none absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-xl bg-white/80 p-2 shadow-xl backdrop-blur">
            <div className="pointer-events-auto flex flex-col gap-2">
                {tools.map((tool) => (
                    <ToolButton
                        key={tool.key}
                        title={tool.title}
                        icon={tool.icon}
                        active={activeTool === tool.key}
                        onClick={() => {
                            tool.onClick?.();
                            setActiveTool(tool.key);
                        }}
                    />
                ))}
                <div className="my-1 h-px bg-slate-200" />
                <ToolButton
                    title={showMiniMap ? 'Hide minimap' : 'Show minimap'}
                    icon="fa-solid fa-map"
                    active={showMiniMap}
                    onClick={onToggleMiniMap}
                />
            </div>
        </div>
    );
}
