import { Handle, Position } from 'reactflow';

export default function FlowStickyNode({ data, selected }) {
    return (
        <>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <div
                className={`min-h-[100px] min-w-[150px] rounded-md border px-3 py-2 shadow ${selected ? 'ring-2 ring-amber-300' : ''}`}
                style={{ backgroundColor: data?.fillColor ?? '#fef08a', borderColor: data?.borderColor ?? '#ca8a04' }}
            >
                <p className="text-sm text-amber-900">{data?.text ?? 'Sticky note'}</p>
            </div>
        </>
    );
}
