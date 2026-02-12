function pointsToPath(points = []) {
    if (!Array.isArray(points) || points.length < 2) return '';
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export default function InkNode({ data, selected }) {
    const path = pointsToPath(data?.points ?? []);
    if (!path) return null;

    return (
        <div className="relative h-full w-full">
            <svg className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-visible">
                <path
                    d={path}
                    fill="none"
                    stroke={data?.color ?? '#0f172a'}
                    strokeWidth={Number(data?.strokeWidth ?? 2.5)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            {selected && <div className="pointer-events-none absolute inset-0 rounded border border-indigo-400/70" />}
        </div>
    );
}
