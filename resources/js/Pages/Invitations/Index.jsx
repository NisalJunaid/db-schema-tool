import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function InvitationsIndex() {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadInvitations = async () => {
        const data = await api.get('/api/v1/invitations');
        setInvitations(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        loadInvitations().finally(() => setLoading(false));
    }, []);

    const processInvitation = async (invitation, action) => {
        await api.post(`/api/v1/invitations/${invitation.id}/${action}`);
        setInvitations((current) => current.filter((item) => item.id !== invitation.id));
    };

    return (
        <>
            <Head title="Invitations" />
            <section className="rounded-xl border bg-white p-6">
                <h1 className="text-xl font-semibold">Invitations</h1>
                {loading ? (
                    <p className="mt-4 text-sm text-slate-600">Loading invitations…</p>
                ) : invitations.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">You have no pending invitations.</p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {invitations.map((invitation) => (
                            <div key={invitation.id} className="rounded-lg border border-slate-200 p-4">
                                <p className="font-medium">
                                    You have been invited to {invitation.type === 'team' ? `join ${invitation.team?.name ?? 'a team'}` : `collaborate on ${invitation.diagram?.name ?? 'a diagram'}`}.
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Role: {invitation.role} · Expires {new Date(invitation.expires_at).toLocaleString()}</p>
                                <div className="mt-3 flex gap-2">
                                    <button type="button" onClick={() => processInvitation(invitation, 'accept')} className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white">Accept</button>
                                    <button type="button" onClick={() => processInvitation(invitation, 'decline')} className="rounded border px-3 py-1.5 text-sm">Decline</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}

