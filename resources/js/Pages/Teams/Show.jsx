import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function TeamShow() {
    const { props } = usePage();
    const teamId = props?.teamId;
    const [team, setTeam] = useState(null);
    const [invite, setInvite] = useState({ email: '', role: 'viewer' });

    const loadTeam = async () => {
        const data = await api.get(`/api/v1/teams/${teamId}`);
        setTeam(data);
    };

    useEffect(() => {
        loadTeam();
    }, [teamId]);

    return (
        <>
            <Head title="Team" />
            <div className="rounded-xl border bg-white p-6">
                <h1 className="text-xl font-semibold">{team?.name}</h1>
                <p className="text-sm text-slate-600">Owner: {team?.owner?.name}</p>

                {team?.can_manage && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        <input value={invite.email} onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))} className="rounded border px-3 py-2" placeholder="member@email.com" />
                        <select value={invite.role} onChange={(e) => setInvite((v) => ({ ...v, role: e.target.value }))} className="rounded border px-3 py-2">
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                            <option value="admin">admin</option>
                        </select>
                        <button
                            type="button"
                            onClick={async () => {
                                await api.post(`/api/v1/teams/${teamId}/members`, invite);
                                setInvite({ email: '', role: 'viewer' });
                                loadTeam();
                            }}
                            className="rounded bg-indigo-600 px-3 py-2 text-white"
                        >
                            Add member
                        </button>
                    </div>
                )}

                <table className="mt-6 w-full text-sm">
                    <thead>
                        <tr className="text-left text-slate-500">
                            <th>Name</th><th>Email</th><th>Role</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {team?.members?.map((member) => (
                            <tr key={member.id} className="border-t">
                                <td className="py-2">{member.name}</td>
                                <td>{member.email}</td>
                                <td>
                                    <select
                                        disabled={!team?.can_manage}
                                        value={member.role}
                                        onChange={async (e) => {
                                            await api.patch(`/api/v1/teams/${teamId}/members/${member.id}`, { role: e.target.value });
                                            loadTeam();
                                        }}
                                        className="rounded border px-2 py-1"
                                    >
                                        <option value="viewer">viewer</option>
                                        <option value="editor">editor</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </td>
                                <td>
                                    {team?.can_manage && (
                                        <button type="button" onClick={async () => { await api.delete(`/api/v1/teams/${teamId}/members/${member.id}`); loadTeam(); }} className="text-red-600">Remove</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
