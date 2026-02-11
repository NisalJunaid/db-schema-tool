import { useMemo, useState } from 'react';

const initialState = {
    email: '',
    role: 'viewer',
    invite_scope: 'diagram',
    diagram_ids: [],
};

export default function InviteModal({ open, onClose, onSubmit, title, roleOptions, diagrams = [], showScope = false, includeDiagramSelect = false }) {
    const [form, setForm] = useState(initialState);
    const [errorMessage, setErrorMessage] = useState('');

    const normalizedRoleOptions = useMemo(() => roleOptions ?? ['viewer', 'editor', 'admin'], [roleOptions]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="mt-4 space-y-3">
                    <input
                        value={form.email}
                        onChange={(e) => {
                            setErrorMessage('');
                            setForm((current) => ({ ...current, email: e.target.value }));
                        }}
                        className="w-full rounded border px-3 py-2"
                        placeholder="email@example.com"
                    />
                    {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                    <select value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))} className="w-full rounded border px-3 py-2">
                        {normalizedRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>

                    {showScope && (
                        <select value={form.invite_scope} onChange={(e) => setForm((current) => ({ ...current, invite_scope: e.target.value }))} className="w-full rounded border px-3 py-2">
                            <option value="diagram">Diagram-only access</option>
                            <option value="team">Team access</option>
                        </select>
                    )}

                    {includeDiagramSelect && diagrams.length > 0 && (
                        <select
                            multiple
                            className="h-32 w-full rounded border px-3 py-2"
                            value={form.diagram_ids.map(String)}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions).map((option) => Number(option.value));
                                setForm((current) => ({ ...current, diagram_ids: selected }));
                            }}
                        >
                            {diagrams.map((diagram) => <option key={diagram.id} value={diagram.id}>{diagram.name}</option>)}
                        </select>
                    )}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={() => { setErrorMessage(''); onClose(); }} className="rounded border px-3 py-1.5">Cancel</button>
                    <button
                        type="button"
                        className="rounded bg-indigo-600 px-3 py-1.5 text-white"
                        onClick={async () => {
                            setErrorMessage('');
                            try {
                                await onSubmit(form);
                                setForm(initialState);
                                onClose();
                            } catch (error) {
                                const backendMessage = error?.payload?.errors?.email?.[0] || error?.message || 'Unable to send invite.';
                                setErrorMessage(backendMessage);
                            }
                        }}
                    >
                        Send Invite
                    </button>
                </div>
            </div>
        </div>
    );
}
