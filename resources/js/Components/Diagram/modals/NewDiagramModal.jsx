import { useState } from 'react';

export default function NewDiagramModal({ open, teams = [], onClose, onCreate }) {
    const [name, setName] = useState('');
    const [ownerType, setOwnerType] = useState('user');
    const [ownerId, setOwnerId] = useState('');

    if (!open) {
        return null;
    }

    const submit = async (event) => {
        event.preventDefault();
        await onCreate({
            name,
            owner_type: ownerType,
            owner_id: ownerType === 'team' ? Number(ownerId) : null,
            viewport: { x: 0, y: 0, zoom: 1 },
        });
        setName('');
        setOwnerType('user');
        setOwnerId('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">New diagram</h2>
                <form className="mt-4 space-y-4" onSubmit={submit}>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                        <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Owner</label>
                        <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                            <option value="user">Personal</option>
                            {!!teams.length && <option value="team">Team</option>}
                        </select>
                    </div>
                    {ownerType === 'team' && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Team</label>
                            <select required value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                <option value="">Select team</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
                        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
