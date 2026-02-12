export default function FlowGroupNode({ data, selected }) {
    return (
        <div
            className={`h-full w-full rounded-xl border-2 border-dashed bg-slate-100/70 px-3 py-2 ${selected ? 'ring-2 ring-slate-300' : ''}`}
            style={{ borderColor: data?.borderColor ?? '#94a3b8' }}
        >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{data?.text ?? 'Group'}</p>
        </div>
    );
}
