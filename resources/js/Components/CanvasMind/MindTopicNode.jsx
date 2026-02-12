import { Handle, Position } from 'reactflow';

export default function MindTopicNode({ data, selected }) {
    return (
        <>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <div
                className={`rounded-full border px-4 py-2 shadow-sm ${selected ? 'ring-2 ring-indigo-300' : ''}`}
                style={{ borderColor: data?.branchColor ?? '#64748b', backgroundColor: '#ffffff' }}
            >
                <p className="text-sm font-medium text-slate-700">{data?.text ?? 'Topic'}</p>
            </div>
        </>
    );
}
