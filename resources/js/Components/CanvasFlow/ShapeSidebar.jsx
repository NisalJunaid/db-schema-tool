const SHAPE_ITEMS = [
    { key: 'rect', icon: 'fa-regular fa-square', title: 'Rectangle' },
    { key: 'rounded', icon: 'fa-regular fa-square-full', title: 'Rounded Rectangle' },
    { key: 'diamond', icon: 'fa-regular fa-gem', title: 'Diamond' },
    { key: 'circle', icon: 'fa-regular fa-circle', title: 'Circle' },
    { key: 'parallelogram', icon: 'fa-solid fa-slash', title: 'Parallelogram' },
    { key: 'cylinder', icon: 'fa-solid fa-database', title: 'Cylinder' },
];

export default function ShapeSidebar({ onSelectShape, onClose, activeShape, editMode = false }) {
    return (
        <div className="pointer-events-auto absolute left-3 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg">
            <button
                type="button"
                aria-label="Close shapes"
                title="Close shapes"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-700 hover:bg-slate-100"
            >
                <i className="fa-solid fa-xmark" />
            </button>
            <div className="h-px w-full bg-slate-200" />
            {SHAPE_ITEMS.map((shape) => {
                const isActive = activeShape === shape.key;
                return (
                    <button
                        key={shape.key}
                        type="button"
                        disabled={!editMode}
                        title={shape.title}
                        aria-label={shape.title}
                        onClick={() => onSelectShape?.(shape.key)}
                        className={`flex h-9 w-9 items-center justify-center rounded-md border ${isActive ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-transparent text-slate-700 hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        <i className={shape.icon} />
                    </button>
                );
            })}
        </div>
    );
}
