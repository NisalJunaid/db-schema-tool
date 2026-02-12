import { Handle, Position } from 'reactflow';

export default function MindTopicNode({ data, selected }) {
    return (
        <>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <div
                className={`group rounded-full border-l-4 px-4 py-2 shadow-md transition-all duration-150 hover:shadow-lg ${selected ? 'ring-2 ring-indigo-300' : ''}`}
                style={{
                    borderLeftColor: data?.branchColor ?? '#64748b',
                    borderColor: '#e2e8f0',
                    background: 'linear-gradient(90deg, #ffffff 0%, #f8fafc 100%)',
                }}
            >
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-700">{data?.text ?? 'Topic'}</p>
                    <span className="text-[10px] text-slate-400">{data?.collapsed ? '◦' : '•'}</span>
                </div>
            </div>
        </>
    );
}
