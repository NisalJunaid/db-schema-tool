import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function TeamsIndex() {
    const [teams, setTeams] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');

    const loadTeams = async () => {
        const data = await api.get('/api/v1/teams');
        setTeams(Array.isArray(data) ? data : data?.data || []);
    };

    useEffect(() => {
        loadTeams();
    }, []);

    return (
        <>
            <Head title="Teams" />
            <div className="rounded-xl border bg-white p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Team Management</h1>
                    <button type="button" onClick={() => setShowModal(true)} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white">Create Team</button>
                </div>

                {teams.length === 0 ? (
                    <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
                        <p className="text-sm text-slate-600">You do not belong to any teams yet.</p>
                        <button type="button" onClick={() => setShowModal(true)} className="mt-3 rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Create Your First Team</button>
                    </div>
                ) : (
                    <div className="mt-4 space-y-2">
                        {teams.map((team) => (
                            <div key={team.id} className="flex items-center justify-between rounded border p-3">
                                <div><p className="font-medium">{team.name}</p></div>
                                <Link href={`/teams/${team.id}`} className="rounded border px-3 py-1.5 text-sm">Open</Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-4">
                        <h3 className="font-semibold">Create team</h3>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-3 w-full rounded border px-3 py-2" placeholder="Team name" />
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowModal(false)} className="rounded border px-3 py-1.5">Cancel</button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await api.post('/api/v1/teams', { name });
                                    setName('');
                                    setShowModal(false);
                                    loadTeams();
                                }}
                                className="rounded bg-indigo-600 px-3 py-1.5 text-white"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
