import { useEffect, useRef, useState } from 'react';
import { Handle, NodeResizer, Position } from 'reactflow';

export default function FlowStickyNode({ id, data, selected }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(data?.label ?? data?.text ?? 'Sticky note');
    const inputRef = useRef(null);

    useEffect(() => {
        setText(data?.label ?? data?.text ?? 'Sticky note');
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
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <div
                className={`h-full w-full rounded-xl border px-3 py-2 shadow-md ${selected ? 'ring-2 ring-amber-300' : ''}`}
                style={{ backgroundColor: data?.fill ?? '#fef08a', borderColor: data?.stroke ?? '#ca8a04' }}
                onDoubleClick={(event) => { event.stopPropagation(); setEditing(true); }}
            >
                {editing ? (
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        onBlur={commit}
                        className="nodrag nopan h-full w-full resize-none rounded border border-amber-300 bg-transparent px-1 py-0.5 text-sm text-amber-900"
                    />
                ) : (
                    <p className="text-sm text-amber-900">{text}</p>
                )}
            </div>
        </>
    );
}
