import React from 'react';

export default function DatabaseAreaNode({ data }) {
    const { name, color = '#e2e8f0', border = '#cbd5e1' } = data || {};

    return (
        <div
            className="relative h-full w-full rounded-2xl border bg-slate-50/70 shadow-sm"
            style={{
                borderColor: border,
                background: `linear-gradient(180deg, ${color}22, rgba(248,250,252,0.85))`,
            }}
        >
            <div className="pointer-events-none flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-slate-700">{name || 'Database'}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-500">DB AREA</span>
            </div>
            <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                DB: {name || 'Database'}
            </span>
            <div className="h-[calc(100%-40px)] w-full" />
        </div>
    );
}
