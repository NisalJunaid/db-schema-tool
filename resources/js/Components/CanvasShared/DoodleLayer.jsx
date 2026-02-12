import { useMemo, useState } from 'react';

const toPath = (points = []) => points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');

export default function DoodleLayer({
    enabled,
    visible,
    doodles,
    activeStroke,
    selectedId,
    onSelect,
    onPointerDown,
    onPointerMove,
    onPointerUp,
}) {
    const [hovered, setHovered] = useState(null);
    const rendered = useMemo(() => (Array.isArray(doodles) ? doodles : []), [doodles]);

    if (!visible) return null;

    return (
        <div
            className={`absolute inset-0 z-30 ${enabled ? 'pointer-events-auto' : 'pointer-events-none'}`}
            onMouseDown={enabled ? onPointerDown : undefined}
            onMouseMove={enabled ? onPointerMove : undefined}
            onMouseUp={enabled ? onPointerUp : undefined}
            onMouseLeave={enabled ? onPointerUp : undefined}
        >
            <svg className="absolute inset-0 h-full w-full">
                {rendered.map((doodle) => {
                    const width = Number(doodle.strokeWidth ?? 2.5);
                    const selected = doodle.id === selectedId;
                    return (
                        <g key={doodle.id}>
                            {selected && (
                                <path
                                    d={toPath(doodle.points)}
                                    fill="none"
                                    stroke="#0f172a"
                                    strokeOpacity="0.2"
                                    strokeWidth={width + 6}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                            <path
                                d={toPath(doodle.points)}
                                fill="none"
                                stroke={doodle.color ?? '#0f172a'}
                                strokeWidth={selected ? width + 1 : width}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                pointerEvents="stroke"
                                onMouseEnter={() => setHovered(doodle.id)}
                                onMouseLeave={() => setHovered(null)}
                            />
                        </g>
                    );
                })}
                {activeStroke?.points?.length > 1 && (
                    <path d={toPath(activeStroke.points)} fill="none" stroke={activeStroke.color ?? '#0f172a'} strokeWidth={activeStroke.strokeWidth ?? 2.5} strokeLinecap="round" strokeLinejoin="round" />
                )}
            </svg>
            {hovered && (
                <div className="absolute bottom-3 right-3 rounded-md bg-slate-900/90 px-2 py-1 text-xs text-white">
                    {rendered.find((entry) => entry.id === hovered)?.userName ?? 'Unknown'}
                </div>
            )}
        </div>
    );
}
