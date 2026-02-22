import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const unitToMinutes = { minutes: 1, hours: 60, days: 1440 };

export default function ShareLinkModal({ diagram, open, onClose }) {
    const [links, setLinks] = useState([]);
    const [form, setForm] = useState({ name: '', type: 'permanent', amount: 5, unit: 'minutes' });
    const [createdLink, setCreatedLink] = useState(null);
    const [busy, setBusy] = useState(false);

    const expiresInValue = useMemo(() => {
        if (form.type === 'permanent') return null;
        return Number(form.amount || 0) * unitToMinutes[form.unit];
    }, [form]);

    const load = async () => {
        if (!diagram?.id) return;
        const data = await api.get(`/api/v1/diagrams/${diagram.id}/share-links`);
        setLinks(Array.isArray(data) ? data : (data?.data ?? []));
    };

    useEffect(() => {
        if (open) {
            setCreatedLink(null);
            load();
        }
    }, [open, diagram?.id]);

    if (!open || !diagram) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white p-5">
                <h3 className="text-lg font-semibold">Share view link · {diagram.name}</h3>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                    <input className="rounded border px-2 py-2 text-sm md:col-span-2" placeholder="Name (optional)" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
                    <select className="rounded border px-2 py-2 text-sm" value={form.type} onChange={(e) => setForm((v) => ({ ...v, type: e.target.value }))}>
                        <option value="permanent">Permanent</option>
                        <option value="expiring">Expiring</option>
                    </select>
                    {form.type === 'expiring' ? (
                        <div className="flex gap-2">
                            <input type="number" min="1" className="w-20 rounded border px-2 py-2 text-sm" value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} />
                            <select className="flex-1 rounded border px-2 py-2 text-sm" value={form.unit} onChange={(e) => setForm((v) => ({ ...v, unit: e.target.value }))}>
                                <option value="minutes">minutes</option>
                                <option value="hours">hours</option>
                                <option value="days">days</option>
                            </select>
                        </div>
                    ) : <div />}
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                            setBusy(true);
                            try {
                                const payload = {
                                    name: form.name || null,
                                    permanent: form.type === 'permanent',
                                };
                                if (form.type === 'expiring') payload.expires_in_value = expiresInValue;
                                const response = await api.post(`/api/v1/diagrams/${diagram.id}/share-links`, payload);
                                setCreatedLink(response);
                                await load();
                            } finally {
                                setBusy(false);
                            }
                        }}
                        className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                        Create link
                    </button>
                    <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-sm">Close</button>
                </div>

                {createdLink?.url && (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                        <div className="font-medium text-emerald-800">New link created</div>
                        <div className="mt-1 break-all text-emerald-700">{createdLink.url}</div>
                        <button
                            type="button"
                            onClick={async () => {
                                await navigator.clipboard.writeText(createdLink.url);
                                window.alert('Link copied');
                            }}
                            className="mt-2 rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-700"
                        >
                            Copy link
                        </button>
                    </div>
                )}

                <div className="mt-5 max-h-72 space-y-2 overflow-auto">
                    {links.map((link) => {
                        const status = link.revoked_at ? 'Revoked' : (!link.expires_at || new Date(link.expires_at) > new Date() ? 'Active' : 'Expired');
                        return (
                            <div key={link.id} className="flex items-center justify-between rounded border p-2 text-sm">
                                <div>
                                    <div className="font-medium text-slate-800">{link.name || `Link #${link.id}`}</div>
                                    <div className="text-xs text-slate-500">Created {new Date(link.created_at).toLocaleString()} · Expires {link.expires_at ? new Date(link.expires_at).toLocaleString() : 'Never'}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full border px-2 py-0.5 text-xs">{status}</span>
                                    {status === 'Active' && <button type="button" onClick={async () => { await api.post(`/api/v1/diagrams/${diagram.id}/share-links/${link.id}/revoke`); await load(); }} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700">Revoke</button>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
