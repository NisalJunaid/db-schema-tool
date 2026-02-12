import { Handle, NodeResizer, Position } from 'reactflow';

const radiusByShape = {
    rect: 'rounded-md',
    roundRect: 'rounded-2xl',
    ellipse: 'rounded-full',
};

const textSizeClassMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
};

export default function FlowShapeNode({ id, data, selected }) {
    const shape = data?.shapeType ?? data?.shape ?? 'rect';
    const isDiamond = shape === 'diamond';
    const isParallelogram = shape === 'parallelogram';
    const isCylinder = shape === 'cylinder';

    const updateLabel = (nextLabel) => {
        const trimmed = (nextLabel ?? '').trim();
        data?.onLabelChange?.(id, trimmed || 'Shape');
    };

    return (
        <>
            <NodeResizer isVisible={selected && data?.editMode && data?.activeTool === 'select'} minWidth={60} minHeight={40} />
            <Handle type="target" position={Position.Top} />
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <Handle type="source" position={Position.Bottom} />
            <div
                className={`h-full w-full border px-3 py-2 shadow-sm ${selected ? 'ring-2 ring-indigo-300' : ''} ${radiusByShape[shape] ?? 'rounded-xl'}`}
                style={{
                    backgroundColor: data?.fill ?? data?.fillColor ?? '#fff',
                    borderColor: data?.stroke ?? data?.borderColor ?? '#475569',
                    borderStyle: data?.borderStyle ?? 'solid',
                    transform: isDiamond ? 'rotate(45deg)' : (isParallelogram ? 'skew(-18deg)' : undefined),
                    borderRadius: isCylinder ? '999px / 22px' : undefined,
                }}
            >
                <div
                    contentEditable={data?.editMode}
                    suppressContentEditableWarning
                    onBlur={(event) => updateLabel(event.target.innerText)}
                    onMouseDown={(event) => event.stopPropagation()}
                    className={`nodrag nopan outline-none text-center text-slate-700 ${textSizeClassMap[data?.textSize ?? data?.fontSize ?? 'md'] ?? 'text-sm'}`}
                    style={{ transform: isDiamond ? 'rotate(-45deg)' : (isParallelogram ? 'skew(18deg)' : undefined) }}
                >
                    {data?.label ?? data?.text ?? 'Shape'}
                </div>
            </div>
        </>
    );
}
