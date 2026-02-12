import { SHAPE_REGISTRY, SHAPE_KEYS } from '@/Components/CanvasFlow/shapeRegistry';

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
            {SHAPE_KEYS.map((shapeKey) => {
                const shape = SHAPE_REGISTRY[shapeKey];
                const isActive = activeShape === shapeKey;
                return (
                    <button
                        key={shapeKey}
                        type="button"
                        disabled={!editMode}
                        title={shape.label}
                        aria-label={shape.label}
                        onClick={() => onSelectShape?.(shapeKey)}
                        className={`flex h-9 w-9 items-center justify-center rounded-md border ${isActive ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-transparent text-slate-700 hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                        <i className={shape.icon} />
                    </button>
                );
            })}
        </div>
    );
}
