import { useEffect, useRef, useState } from 'react';
import { Handle, Position } from 'reactflow';

export default function MindTopicNode({ id, data, selected }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(data?.label ?? data?.text ?? 'Topic');
    const inputRef = useRef(null);

    useEffect(() => {
        setText(data?.label ?? data?.text ?? 'Topic');
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
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
            <div
                className={`group rounded-full border-l-4 px-4 py-2 shadow-md ${selected ? 'ring-2 ring-indigo-300' : ''}`}
                style={{ borderLeftColor: data?.branchColor ?? '#64748b', borderColor: '#e2e8f0', background: 'linear-gradient(90deg, #ffffff 0%, #f8fafc 100%)' }}
                onDoubleClick={(event) => { event.stopPropagation(); setEditing(true); }}
            >
                <div className="flex items-center gap-2">
                    {editing ? (
                        <input
                            ref={inputRef}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            onBlur={commit}
                            onKeyDown={(event) => { if (event.key === 'Enter') commit(); }}
                            className="nodrag nopan rounded border border-slate-300 px-1 py-0.5 text-sm"
                        />
                    ) : (
                        <p className="text-sm font-medium text-slate-700">{text}</p>
                    )}
                    <button
                        type="button"
                        className="nodrag nopan text-xs text-slate-500"
                        onClick={(event) => {
                            event.stopPropagation();
                            data?.onToggleCollapse?.(id, !data?.collapsed);
                        }}
                    >
                        {data?.collapsed ? '▸' : '▾'}
                    </button>
                </div>
            </div>
        </>
    );
}
