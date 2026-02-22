import { memo } from 'react';
import { NodeResizer } from 'reactflow';

function DatabaseGroupNode({ data }) {
    const color = data?.color || '#64748b';
    const width = Number(data?.width ?? 1200);
    const height = Number(data?.height ?? 800);
    const canResize = Boolean(data?.canResize);

    const handleResizeEnd = (_, nextSize) => {
        data?.onResizeEnd?.({
            width: Math.max(200, Math.round(nextSize?.width ?? width)),
            height: Math.max(200, Math.round(nextSize?.height ?? height)),
        });
    };

    return (
        <div
            className="relative rounded-xl border p-4 shadow-sm"
            style={{
                width,
                height,
                backgroundColor: `${color}20`,
                borderColor: color,
            }}
        >
            <NodeResizer
                minWidth={200}
                minHeight={200}
                isVisible={canResize}
                onResizeEnd={handleResizeEnd}
                lineStyle={{ borderColor: color }}
                handleStyle={{ backgroundColor: color, borderColor: '#fff' }}
            />
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {data?.name ?? 'Database'}
            </div>
        </div>
    );
}

export default memo(DatabaseGroupNode);
