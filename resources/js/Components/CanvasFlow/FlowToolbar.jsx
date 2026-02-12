import ShapeSidebar from '@/Components/CanvasFlow/ShapeSidebar';

const TOOL_GROUPS = [
    {
        label: 'Navigation',
        tools: [
            { key: 'select', icon: 'fa-solid fa-arrow-pointer', title: 'Select' },
            { key: 'pan', icon: 'fa-regular fa-hand', title: 'Pan' },
        ],
    },
    {
        label: 'Shapes',
        tools: [
            { key: 'shapes', icon: 'fa-solid fa-shapes', title: 'Shapes' },
        ],
    },
    {
        label: 'Node Tools',
        tools: [
            { key: 'text', icon: 'fa-solid fa-font', title: 'Text (click)' },
            { key: 'sticky', icon: 'fa-solid fa-note-sticky', title: 'Sticky (click)' },
        ],
    },
    {
        label: 'Edges',
        tools: [
            { key: 'connector', icon: 'fa-solid fa-arrow-right-long', title: 'Connector' },
        ],
    },
    {
        label: 'Ink',
        tools: [
            { key: 'pen', icon: 'fa-solid fa-pen', title: 'Pen' },
            { key: 'toggle-ink', icon: 'fa-solid fa-eye', title: 'Toggle ink' },
        ],
    },
];

export default function FlowToolbar({
    activeTool,
    onSelectTool,
    editMode = false,
    showInk = true,
    onToggleInk,
    toolbarMode = 'default',
    onSetToolbarMode,
    activeShape = null,
    onSelectShape,
}) {
    if (toolbarMode === 'shapes') {
        return (
            <ShapeSidebar
                activeShape={activeShape}
                editMode={editMode}
                onSelectShape={onSelectShape}
                onClose={() => onSetToolbarMode?.('default')}
            />
        );
    }

    return (
        <div className="pointer-events-auto absolute left-3 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg">
            {TOOL_GROUPS.map((group, groupIndex) => (
                <div key={group.label} className="flex flex-col gap-1.5">
                    {groupIndex > 0 && <div className="my-0.5 h-px w-full bg-slate-200" />}
                    {group.tools.map((tool) => {
                        const isToggle = tool.key === 'toggle-ink';
                        const icon = isToggle ? (showInk ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash') : tool.icon;
                        const isShapesButton = tool.key === 'shapes';
                        const disabled = !editMode && !isToggle;
                        const isActive = isToggle ? false : (isShapesButton ? toolbarMode === 'shapes' : activeTool === tool.key);

                        return (
                            <button
                                key={tool.key}
                                type="button"
                                title={tool.title}
                                aria-label={tool.title}
                                disabled={disabled}
                                onClick={() => {
                                    if (isToggle) {
                                        onToggleInk?.();
                                        return;
                                    }

                                    if (isShapesButton) {
                                        onSetToolbarMode?.('shapes');
                                        return;
                                    }

                                    onSelectTool?.(tool.key);
                                }}
                                className={`pointer-events-auto flex h-9 w-9 items-center justify-center rounded-md border ${isActive ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-transparent text-slate-700 hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                <i className={icon} />
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
