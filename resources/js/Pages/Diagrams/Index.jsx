import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import CarouselRow from '@/Components/Diagrams/CarouselRow';
import DiagramCard from '@/Components/Diagrams/DiagramCard';
import ShareAccessModal from '@/Components/Diagrams/ShareAccessModal';
import InviteModal from '@/Components/Diagrams/InviteModal';

const emptyForm = { name: '', ownerType: 'user', teamId: '' };

export default function DiagramsIndex() {
    const [diagrams, setDiagrams] = useState([]);
    const [teams, setTeams] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm);
    const [visibilityFilter, setVisibilityFilter] = useState('all');
    const [shareDiagram, setShareDiagram] = useState(null);
    const [inviteDiagram, setInviteDiagram] = useState(null);

    const load = async () => {
        const [diagramData, teamData] = await Promise.all([api.get('/api/v1/diagrams'), api.get('/api/v1/teams')]);
        setDiagrams(Array.isArray(diagramData) ? diagramData : []);
        setTeams(Array.isArray(teamData) ? teamData : []);
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        if (visibilityFilter === 'public') return diagrams.filter((diagram) => diagram.is_public);
        if (visibilityFilter === 'private') return diagrams.filter((diagram) => !diagram.is_public);
        return diagrams;
    }, [diagrams, visibilityFilter]);

    const personal = filtered
        .filter((diagram) => `${diagram.owner_type}`.toLowerCase().includes('user'))
        .map((diagram) => ({ ...diagram, owner_label: 'Personal' }));

    const teamGroups = teams
        .map((team) => ({
            team,
            diagrams: filtered
                .filter((diagram) => `${diagram.owner_type}`.toLowerCase().includes('team') && Number(diagram.owner_id) === Number(team.id))
                .map((diagram) => ({ ...diagram, owner_label: team.name })),
        }))
        .filter((group) => group.diagrams.length > 0);

    const updateName = async (diagram) => {
        const name = window.prompt('New diagram name', diagram.name);
        if (!name) return;
        await api.patch(`/api/v1/diagrams/${diagram.id}`, { name });
        load();
    };

    const removeDiagram = async (diagram) => {
        if (!window.confirm(`Delete ${diagram.name}?`)) return;
        await api.delete(`/api/v1/diagrams/${diagram.id}`);
        load();
    };

    const toggleVisibility = async (diagram) => {
        await api.patch(`/api/v1/diagrams/${diagram.id}/visibility`, { is_public: !diagram.is_public });
        setDiagrams((current) => current.map((item) => (item.id === diagram.id ? { ...item, is_public: !diagram.is_public } : item)));
    };

    const renderCard = (diagram) => (
        <DiagramCard
            key={diagram.id}
            diagram={diagram}
            onOpen={() => router.visit(`/diagrams/${diagram.id}`)}
            onRename={() => updateName(diagram)}
            onToggleVisibility={() => toggleVisibility(diagram)}
            onInvite={() => setInviteDiagram(diagram)}
            onManageAccess={() => setShareDiagram(diagram)}
            onDelete={() => removeDiagram(diagram)}
        />
    );

    return (
        <>
            <Head title="Diagrams" />
            <section className="space-y-6">
                <div className="rounded-2xl border bg-white p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-2xl font-semibold">Diagrams</h1>
                        <div className="flex items-center gap-2">
                            <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)} className="rounded border px-3 py-2 text-sm">
                                <option value="all">All</option>
                                <option value="private">Private only</option>
                                <option value="public">Public only</option>
                            </select>
                            <button type="button" onClick={() => setShowModal(true)} className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">+ New diagram</button>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border bg-white p-6">
                    <h2 className="text-lg font-semibold">Personal Diagrams</h2>
                    <div className="mt-3"><CarouselRow>{personal.map(renderCard)}</CarouselRow></div>
                </div>

                {teamGroups.map((group) => (
                    <div key={group.team.id} className="rounded-2xl border bg-white p-6">
                        <h2 className="text-lg font-semibold">Team: {group.team.name}</h2>
                        <div className="mt-3"><CarouselRow>{group.diagrams.map(renderCard)}</CarouselRow></div>
                    </div>
                ))}
            </section>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6">
                        <h3 className="text-lg font-semibold">Create new diagram</h3>
                        <div className="mt-4 space-y-3">
                            <input value={createForm.name} onChange={(e) => setCreateForm((v) => ({ ...v, name: e.target.value }))} className="w-full rounded border px-3 py-2" placeholder="Name" />
                            <select value={createForm.ownerType} onChange={(e) => setCreateForm((v) => ({ ...v, ownerType: e.target.value }))} className="w-full rounded border px-3 py-2">
                                <option value="user">Personal</option>
                                <option value="team">Team</option>
                            </select>
                            {createForm.ownerType === 'team' && (
                                <select value={createForm.teamId} onChange={(e) => setCreateForm((v) => ({ ...v, teamId: e.target.value }))} className="w-full rounded border px-3 py-2">
                                    <option value="">Choose team</option>
                                    {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                                </select>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowModal(false)} className="rounded border px-3 py-1.5">Cancel</button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await api.post('/api/v1/diagrams', {
                                        name: createForm.name,
                                        owner_type: createForm.ownerType,
                                        owner_id: createForm.ownerType === 'team' ? Number(createForm.teamId) : undefined,
                                    });
                                    setShowModal(false);
                                    setCreateForm(emptyForm);
                                    load();
                                }}
                                className="rounded bg-indigo-600 px-3 py-1.5 text-white"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ShareAccessModal diagram={shareDiagram} teams={teams} open={Boolean(shareDiagram)} onClose={() => setShareDiagram(null)} />
            <InviteModal
                open={Boolean(inviteDiagram)}
                onClose={() => setInviteDiagram(null)}
                title="Invite Collaborator"
                roleOptions={['viewer', 'editor', 'admin']}
                showScope={Boolean(inviteDiagram && String(inviteDiagram.owner_type).includes('team'))}
                onSubmit={async (payload) => {
                    if (!inviteDiagram) return;
                    await api.post(`/api/v1/diagrams/${inviteDiagram.id}/invite`, payload);
                }}
            />
        </>
    );
}
