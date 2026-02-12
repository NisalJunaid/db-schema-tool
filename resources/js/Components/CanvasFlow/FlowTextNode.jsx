import { useEffect, useRef, useState } from 'react';
import { Handle, NodeResizer, Position } from 'reactflow';

export default function FlowTextNode({ id, data, selected }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(data?.label ?? data?.text ?? 'Text');
    const inputRef = useRef(null);

    useEffect(() => {
        setText(data?.label ?? data?.text ?? 'Text');
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
            <div className={`h-full w-full bg-transparent px-2 py-1 ${selected ? 'rounded-md ring-2 ring-indigo-300' : ''}`} onDoubleClick={(event) => { event.stopPropagation(); setEditing(true); }}>
                {editing ? (
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        onBlur={commit}
                        onKeyDown={(event) => { if (event.key === 'Enter') commit(); }}
                        className="nodrag nopan w-full rounded border border-slate-300 px-1 py-0.5 text-sm"
                    />
                ) : (
                    <p className="text-base font-medium text-slate-700">{text}</p>
                )}
            </div>
        </>
    );
}
