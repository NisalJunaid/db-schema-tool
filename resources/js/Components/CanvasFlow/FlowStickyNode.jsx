import { Handle, Position } from 'reactflow';

export default function FlowStickyNode({ data, selected }) {
    const stickyColors = {
        yellow: '#fef08a',
        blue: '#bfdbfe',
        pink: '#fbcfe8',
    };
    const fill = stickyColors[data?.tone] ?? data?.fillColor ?? '#fef08a';

    return (
        <>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <div
                className={`min-h-[100px] min-w-[150px] rounded-xl border px-3 py-2 shadow-md transition-all hover:shadow-lg ${selected ? 'ring-2 ring-amber-300' : ''}`}
                style={{ backgroundColor: fill, borderColor: data?.borderColor ?? '#ca8a04', transform: 'rotate(-1.2deg)' }}
            >
                <p className="text-sm text-amber-900">{data?.text ?? 'Sticky note'}</p>
            </div>
        </>
    );
}
