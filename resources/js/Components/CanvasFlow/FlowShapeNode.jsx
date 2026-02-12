import { Handle, Position } from 'reactflow';

const radiusByShape = {
    rectangle: 'rounded-md',
    rounded: 'rounded-2xl',
    circle: 'rounded-full',
};

export default function FlowShapeNode({ data, selected }) {
    const shape = data?.shape ?? 'rectangle';
    const isDiamond = shape === 'diamond';
    const font = data?.fontSize === 'lg' ? 'text-lg' : data?.fontSize === 'sm' ? 'text-xs' : 'text-sm';

    return (
        <>
            <Handle type="target" position={Position.Top} />
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <Handle type="source" position={Position.Bottom} />
            <div
                className={`min-w-[150px] border px-4 py-3 shadow-md transition-all duration-150 hover:shadow-lg hover:shadow-indigo-100 ${selected ? 'ring-2 ring-indigo-300' : ''} ${radiusByShape[shape] ?? 'rounded-xl'}`}
                style={{
                    backgroundColor: data?.fillColor,
                    borderColor: data?.borderColor,
                    borderStyle: data?.borderStyle ?? 'solid',
                    transform: isDiamond ? 'rotate(45deg)' : undefined,
                    transition: 'transform 0.15s ease',
                }}
            >
                <p
                    className={`text-slate-700 ${font}`}
                    style={{ transform: isDiamond ? 'rotate(-45deg)' : undefined, textAlign: data?.textAlign ?? 'center' }}
                >
                    {data?.text}
                </p>
            </div>
        </>
    );
}
