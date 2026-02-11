import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ShareAccessModal({ diagram, teams, open, onClose }) {
    const [isPublic, setIsPublic] = useState(false);
    const [entries, setEntries] = useState([]);
    const [form, setForm] = useState({ subject_type: 'user', subject_id: '', role: 'viewer' });

    const load = async () => {
        const data = await api.get(`/api/v1/diagrams/${diagram.id}/access`);
        setIsPublic(Boolean(data.is_public));
        setEntries(data.entries || []);
    };

    useEffect(() => {
        if (open && diagram?.id) {
            load();
        }
    }, [open, diagram?.id]);

    if (!open || !diagram) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-xl rounded-xl bg-white p-5">
                <h3 className="text-lg font-semibold">Share access · {diagram.name}</h3>
                <label className="mt-4 flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={async (e) => {
                            const next = e.target.checked;
                            setIsPublic(next);
                            await api.patch(`/api/v1/diagrams/${diagram.id}/visibility`, { is_public: next });
                        }}
                    />
                    Public diagram
                </label>
                <div className="mt-4 space-y-2">
                    {entries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded border p-2 text-sm">
                            <span>{entry.subject_type} #{entry.subject_id}</span>
                            <div className="flex items-center gap-2">
                                <select
                                    value={entry.role}
                                    onChange={async (e) => {
                                        await api.patch(`/api/v1/diagrams/${diagram.id}/access/${entry.id}`, { role: e.target.value });
                                        load();
                                    }}
                                >
                                    <option value="viewer">viewer</option>
                                    <option value="editor">editor</option>
                                    <option value="admin">admin</option>
                                </select>
                                <button type="button" onClick={async () => { await api.delete(`/api/v1/diagrams/${diagram.id}/access/${entry.id}`); load(); }}>
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                    <select value={form.subject_type} onChange={(e) => setForm((v) => ({ ...v, subject_type: e.target.value, subject_id: '' }))}>
                        <option value="user">User</option>
                        <option value="team">Team</option>
                    </select>
                    <input placeholder={form.subject_type === 'user' ? 'User ID' : 'Team ID'} value={form.subject_id} onChange={(e) => setForm((v) => ({ ...v, subject_id: e.target.value }))} className="rounded border px-2" />
                    <select value={form.role} onChange={(e) => setForm((v) => ({ ...v, role: e.target.value }))}>
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                        <option value="admin">admin</option>
                    </select>
                </div>
                {form.subject_type === 'team' && teams?.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">Teams available: {teams.map((team) => `${team.name} (#${team.id})`).join(', ')}</p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded border px-3 py-1.5">Close</button>
                    <button
                        type="button"
                        onClick={async () => {
                            await api.post(`/api/v1/diagrams/${diagram.id}/access`, {
                                subject_type: form.subject_type,
                                subject_id: Number(form.subject_id),
                                role: form.role,
                            });
                            setForm({ subject_type: 'user', subject_id: '', role: 'viewer' });
                            load();
                        }}
                        className="rounded bg-indigo-600 px-3 py-1.5 text-white"
                    >
                        Add share
                    </button>
                </div>
            </div>
        </div>
    );
}
