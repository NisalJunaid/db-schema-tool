import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import InviteModal from '@/Components/Diagrams/InviteModal';

export default function TeamShow() {
    const { props } = usePage();
    const teamId = props?.teamId;
    const [team, setTeam] = useState(null);
    const [showInvite, setShowInvite] = useState(false);

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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">{team?.name}</h1>
                        <p className="text-sm text-slate-600">Owner: {team?.owner?.name}</p>
                    </div>
                    {team?.can_manage && (
                        <button type="button" onClick={() => setShowInvite(true)} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white">Invite Member</button>
                    )}
                </div>

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
                                        <option value="member">member</option>
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

            <InviteModal
                open={showInvite}
                onClose={() => setShowInvite(false)}
                title="Invite Team Member"
                roleOptions={['member', 'editor', 'admin']}
                diagrams={team?.diagrams ?? []}
                includeDiagramSelect
                onSubmit={async (payload) => {
                    await api.post(`/api/v1/teams/${teamId}/invite`, {
                        email: payload.email,
                        role: payload.role,
                        diagram_ids: payload.diagram_ids,
                    });
                }}
            />
        </>
    );
}
