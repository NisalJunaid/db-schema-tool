import { Handle, Position } from 'reactflow';

export default function FlowTextNode({ data, selected }) {
    const font = data?.fontSize === 'lg' ? 'text-xl' : data?.fontSize === 'sm' ? 'text-sm' : 'text-base';

    return (
        <>
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <div className={`min-w-[120px] bg-transparent px-2 py-1 ${selected ? 'ring-2 ring-indigo-300 rounded-md' : ''}`}>
                <p className={`font-medium text-slate-700 ${font}`}>{data?.text ?? 'Text'}</p>
            </div>
        </>
    );
}
