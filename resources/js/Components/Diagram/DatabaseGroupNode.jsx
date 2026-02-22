import { memo } from 'react';

function DatabaseGroupNode({ data }) {
    const color = data?.color || '#64748b';

    return (
        <div
            className="relative rounded-xl border p-4 shadow-sm"
            style={{
                width: data?.width ?? 1200,
                height: data?.height ?? 800,
                backgroundColor: `${color}20`,
                borderColor: color,
            }}
        >
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {data?.name ?? 'Database'}
            </div>
        </div>
    );
}

export default memo(DatabaseGroupNode);
