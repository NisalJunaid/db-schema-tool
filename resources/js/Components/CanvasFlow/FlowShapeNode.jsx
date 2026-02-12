import { useEffect, useRef, useState } from 'react';
import { Handle, NodeResizer, Position } from 'reactflow';

const radiusByShape = {
    rect: 'rounded-md',
    roundRect: 'rounded-2xl',
    ellipse: 'rounded-full',
};

export default function FlowShapeNode({ id, data, selected }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(data?.label ?? data?.text ?? 'Shape');
    const inputRef = useRef(null);
    const shape = data?.shapeType ?? 'rect';
    const isDiamond = shape === 'diamond';

    useEffect(() => {
        setText(data?.label ?? data?.text ?? 'Shape');
    }, [data?.label, data?.text]);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const commit = () => {
        setEditing(false);
        data?.onLabelChange?.(id, text);
    };

    return (
        <>
            <NodeResizer isVisible={selected && data?.editMode} minWidth={80} minHeight={40} />
            <Handle type="target" position={Position.Top} />
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <Handle type="source" position={Position.Bottom} />
            <div
                onDoubleClick={(event) => { event.stopPropagation(); setEditing(true); }}
                className={`h-full w-full border px-3 py-2 shadow-sm ${selected ? 'ring-2 ring-indigo-300' : ''} ${radiusByShape[shape] ?? 'rounded-xl'}`}
                style={{
                    backgroundColor: data?.fill ?? data?.fillColor ?? '#fff',
                    borderColor: data?.stroke ?? data?.borderColor ?? '#475569',
                    borderStyle: data?.borderStyle ?? 'solid',
                    transform: isDiamond ? 'rotate(45deg)' : undefined,
                }}
            >
                {editing ? (
                    <input
                        ref={inputRef}
                        className="nodrag nopan w-full rounded border border-slate-300 px-1 py-0.5 text-sm"
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit(); }}
                        onMouseDown={(event) => event.stopPropagation()}
                    />
                ) : (
                    <p className="text-center text-sm text-slate-700" style={{ transform: isDiamond ? 'rotate(-45deg)' : undefined }}>{text}</p>
                )}
            </div>
        </>
    );
}
