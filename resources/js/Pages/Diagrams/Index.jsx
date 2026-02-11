import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import CarouselRow from '@/Components/Diagrams/CarouselRow';
import DiagramCard from '@/Components/Diagrams/DiagramCard';
import InvitationDiagramCard from '@/Components/Diagrams/InvitationDiagramCard';
import ShareAccessModal from '@/Components/Diagrams/ShareAccessModal';
import InviteModal from '@/Components/Diagrams/InviteModal';
import Toast from '@/Components/UI/Toast';

const emptyForm = { name: '', ownerType: 'user', teamId: '' };

const asCollection = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

export default function DiagramsIndex() {
    const [diagrams, setDiagrams] = useState([]);
    const [teams, setTeams] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm);
    const [visibilityFilter, setVisibilityFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [shareDiagram, setShareDiagram] = useState(null);
    const [inviteDiagram, setInviteDiagram] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busyAction, setBusyAction] = useState(null);
    const [bannerError, setBannerError] = useState('');
    const [toast, setToast] = useState(null);

    const load = async () => {
        setLoading(true);
        setBannerError('');
        try {
            const [diagramData, teamData, invitationData] = await Promise.all([
                api.get('/api/v1/diagrams'),
                api.get('/api/v1/teams'),
                api.get('/api/v1/invitations'),
            ]);

            setDiagrams(asCollection(diagramData));
            setTeams(asCollection(teamData));
            setInvitations(asCollection(invitationData).filter((invitation) => `${invitation.status}`.toLowerCase() === 'pending'));
        } catch (error) {
            setBannerError(error.message || 'Unable to load diagrams. Please refresh and try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return diagrams.filter((diagram) => {
            const byVisibility =
                visibilityFilter === 'public' ? diagram.is_public : visibilityFilter === 'private' ? !diagram.is_public : true;
            const bySearch = query ? `${diagram.name}`.toLowerCase().includes(query) : true;
            return byVisibility && bySearch;
        });
    }, [diagrams, search, visibilityFilter]);

    const teamInvites = useMemo(
        () => invitations.filter((invitation) => `${invitation.type}`.toLowerCase() === 'team'),
        [invitations],
    );

    const diagramInvites = useMemo(
        () => invitations.filter((invitation) => `${invitation.type}`.toLowerCase() === 'diagram'),
        [invitations],
    );

    const personalDiagrams = filtered
        .filter((diagram) => {
            const ownerType = `${diagram.owner_type}`.toLowerCase();
            return ownerType.includes('user') || Boolean(diagram.is_directly_shared);
        })
        .map((diagram) => ({
            ...diagram,
            owner_label: `${diagram.owner_type}`.toLowerCase().includes('user') ? 'Personal' : 'Shared with me',
        }));

    const teamGroups = teams.map((team) => ({
        team,
        invitations: teamInvites.filter((invitation) => Number(invitation.team_id) === Number(team.id)),
        diagrams: filtered
            .filter(
                (diagram) =>
                    `${diagram.owner_type}`.toLowerCase().includes('team')
                    && Number(diagram.owner_id) === Number(team.id)
                    && !diagram.is_directly_shared,
            )
            .map((diagram) => ({ ...diagram, owner_label: team.name || 'Team' })),
    }));

    const personalCards = [
        ...diagramInvites.map((invitation) => ({ type: 'invitation', key: `invitation-${invitation.id}`, invitation })),
        ...personalDiagrams.map((diagram) => ({ type: 'diagram', key: `diagram-${diagram.id}`, diagram })),
    ];

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

    const handleAcceptInvitation = async (invitation) => {
        const previousInvitations = invitations;
        setBusyAction(`accept-${invitation.id}`);
        setInvitations((current) => current.filter((item) => item.id !== invitation.id));

        try {
            const response = await api.post(`/api/v1/invitations/${invitation.id}/accept`);
            const payload = response?.data ?? response;
            const acceptedDiagram = payload?.diagram;

            if (`${invitation.type}`.toLowerCase() === 'diagram' && acceptedDiagram?.id) {
                setDiagrams((current) => {
                    const existingIndex = current.findIndex((item) => Number(item.id) === Number(acceptedDiagram.id));
                    if (existingIndex >= 0) {
                        return current.map((item) => (Number(item.id) === Number(acceptedDiagram.id) ? acceptedDiagram : item));
                    }
                    return [acceptedDiagram, ...current];
                });
            } else {
                const diagramData = await api.get('/api/v1/diagrams');
                setDiagrams(asCollection(diagramData));
            }

            if (`${invitation.type}`.toLowerCase() === 'team') {
                const [teamData, invitationData] = await Promise.all([
                    api.get('/api/v1/teams'),
                    api.get('/api/v1/invitations'),
                ]);
                setTeams(asCollection(teamData));
                setInvitations(asCollection(invitationData).filter((item) => `${item.status}`.toLowerCase() === 'pending'));
            }

            setToast({ message: 'Invitation accepted', variant: 'success' });
        } catch (error) {
            setInvitations(previousInvitations);
            setToast({ message: error.message || 'Unable to accept invitation', variant: 'error' });
        } finally {
            setBusyAction(null);
        }
    };

    const handleDeclineInvitation = async (invitation) => {
        const previousInvitations = invitations;
        setBusyAction(`decline-${invitation.id}`);
        setInvitations((current) => current.filter((item) => item.id !== invitation.id));

        try {
            await api.post(`/api/v1/invitations/${invitation.id}/decline`);
            setToast({ message: 'Invitation declined', variant: 'info' });
        } catch (error) {
            setInvitations(previousInvitations);
            setToast({ message: error.message || 'Unable to decline invitation', variant: 'error' });
        } finally {
            setBusyAction(null);
        }
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
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Diagrams</h1>
                            <p className="mt-1 text-sm text-slate-500">Manage personal and team diagram workspaces.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowModal(true)}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                        >
                            + New diagram
                        </button>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="inline-flex rounded-lg bg-slate-100 p-1">
                            {['all', 'private', 'public'].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setVisibilityFilter(value)}
                                    className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                                        visibilityFilter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search diagrams"
                            className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                </div>

                {bannerError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {bannerError}
                    </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Personal
                            {diagramInvites.length > 0 && (
                                <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                    {diagramInvites.length} pending invitation{diagramInvites.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="mt-4">
                        <CarouselRow
                            emptyState={
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                    <p className="text-sm text-slate-600">No personal diagrams yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(true)}
                                        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                                    >
                                        Create your first diagram
                                    </button>
                                </div>
                            }
                        >
                            {personalCards.map((card) =>
                                card.type === 'invitation' ? (
                                    <InvitationDiagramCard
                                        key={card.key}
                                        invitation={card.invitation}
                                        busyAction={busyAction}
                                        onAccept={handleAcceptInvitation}
                                        onDecline={handleDeclineInvitation}
                                    />
                                ) : (
                                    renderCard(card.diagram)
                                ),
                            )}
                        </CarouselRow>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">Teams</h2>
                        {teamGroups.every((group) => group.diagrams.length === 0 && group.invitations.length === 0) && (
                            <Link href="/teams" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                                Manage teams
                            </Link>
                        )}
                    </div>

                    <div className="mt-4 space-y-6">
                        {teamGroups.length === 0 || teamGroups.every((group) => group.diagrams.length === 0 && group.invitations.length === 0) ? (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                <p className="text-sm text-slate-600">No team diagrams available yet.</p>
                            </div>
                        ) : (
                            teamGroups.map((group) => (
                                <div key={group.team.id}>
                                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                                        {group.team.name}
                                        {group.invitations.length > 0 && (
                                            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                                {group.invitations.length} invite{group.invitations.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </h3>
                                    <CarouselRow
                                        emptyState={
                                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                                                No diagrams for this team yet.
                                            </div>
                                        }
                                    >
                                        {group.invitations.map((invitation) => (
                                            <InvitationDiagramCard
                                                key={`invitation-${invitation.id}`}
                                                invitation={invitation}
                                                busyAction={busyAction}
                                                onAccept={handleAcceptInvitation}
                                                onDecline={handleDeclineInvitation}
                                            />
                                        ))}
                                        {group.diagrams.map(renderCard)}
                                    </CarouselRow>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {loading && <p className="text-sm text-slate-500">Loading diagrams...</p>}
            </section>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6">
                        <h3 className="text-lg font-semibold">Create new diagram</h3>
                        <div className="mt-4 space-y-3">
                            <input
                                value={createForm.name}
                                onChange={(e) => setCreateForm((v) => ({ ...v, name: e.target.value }))}
                                className="w-full rounded border px-3 py-2"
                                placeholder="Name"
                            />
                            <select
                                value={createForm.ownerType}
                                onChange={(e) => setCreateForm((v) => ({ ...v, ownerType: e.target.value }))}
                                className="w-full rounded border px-3 py-2"
                            >
                                <option value="user">Personal</option>
                                <option value="team">Team</option>
                            </select>
                            {createForm.ownerType === 'team' && (
                                <select
                                    value={createForm.teamId}
                                    onChange={(e) => setCreateForm((v) => ({ ...v, teamId: e.target.value }))}
                                    className="w-full rounded border px-3 py-2"
                                >
                                    <option value="">Choose team</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowModal(false)} className="rounded border px-3 py-1.5">
                                Cancel
                            </button>
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

            <Toast message={toast?.message} variant={toast?.variant} onClose={() => setToast(null)} />
        </>
    );
}
