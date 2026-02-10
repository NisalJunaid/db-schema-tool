import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';

const emptyForm = {
    name: '',
    ownerType: 'personal',
    teamId: '',
};

function flattenDiagrams(payload) {
    if (!payload) {
        return [];
    }

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload.data)) {
        return payload.data;
    }

    return [];
}

export default function DiagramsIndex() {
    const { props } = usePage();
    const authUser = props?.auth?.user;

    const [diagrams, setDiagrams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [creating, setCreating] = useState(false);

    const [teams, setTeams] = useState(Array.isArray(props?.teams) ? props.teams : []);
    const [supportsTeamOwner, setSupportsTeamOwner] = useState(Array.isArray(props?.teams));

    useEffect(() => {
        const loadDiagrams = async () => {
            try {
                setLoading(true);
                setError('');
                const data = await apiRequest('/api/v1/diagrams');
                setDiagrams(flattenDiagrams(data));
            } catch (loadError) {
                setError(loadError.message || 'Failed to load diagrams.');
            } finally {
                setLoading(false);
            }
        };

        loadDiagrams();
    }, []);

    useEffect(() => {
        if (Array.isArray(props?.teams)) {
            setTeams(props.teams);
            setSupportsTeamOwner(true);
            return;
        }

        const loadTeams = async () => {
            try {
                const response = await apiRequest('/api/v1/teams');
                const teamList = Array.isArray(response?.data)
                    ? response.data
                    : Array.isArray(response)
                      ? response
                      : [];

                setTeams(teamList);
                setSupportsTeamOwner(teamList.length > 0);
            } catch {
                setTeams([]);
                setSupportsTeamOwner(false);
            }
        };

        loadTeams();
    }, [props?.teams]);

    const myDiagrams = useMemo(() => {
        if (!authUser?.id) {
            return diagrams;
        }

        return diagrams.filter((diagram) => {
            return (
                diagram?.owner_type === 'user' ||
                diagram?.owner_type?.toLowerCase()?.includes('user') ||
                Number(diagram?.owner_id) === Number(authUser.id)
            );
        });
    }, [diagrams, authUser?.id]);

    const teamDiagramGroups = useMemo(() => {
        const grouped = diagrams.filter((diagram) => {
            return diagram?.owner_type === 'team' || diagram?.owner_type?.toLowerCase()?.includes('team');
        });

        return grouped.reduce((carry, diagram) => {
            const teamId = Number(diagram?.owner_id);
            const team = teams.find((candidate) => Number(candidate.id) === teamId);
            const key = team?.name || `Team #${teamId}`;

            if (!carry[key]) {
                carry[key] = {
                    teamId,
                    teamName: key,
                    diagrams: [],
                };
            }

            carry[key].diagrams.push(diagram);
            return carry;
        }, {});
    }, [diagrams, teams]);

    const teamGroups = useMemo(() => Object.values(teamDiagramGroups), [teamDiagramGroups]);

    const openModal = () => {
        setCreateForm(emptyForm);
        setFormErrors({});
        setShowModal(true);
    };

    const submitCreateDiagram = async (event) => {
        event.preventDefault();
        setCreating(true);
        setFormErrors({});

        const isTeam = createForm.ownerType === 'team';
        const payload = {
            name: createForm.name,
            owner_type: isTeam ? 'team' : 'user',
            owner_id: isTeam ? Number(createForm.teamId) : authUser?.id,
        };

        try {
            const response = await apiRequest('/api/v1/diagrams', {
                method: 'POST',
                data: payload,
            });

            const createdDiagram = response?.data ?? response;
            const createdId = createdDiagram?.id;

            setShowModal(false);

            if (createdId) {
                router.visit(`/diagrams/${createdId}`);
            }
        } catch (submitError) {
            const validationErrors = submitError?.payload?.errors ?? {};
            setFormErrors(validationErrors);

            if (Object.keys(validationErrors).length === 0) {
                setFormErrors({ general: [submitError.message || 'Unable to create diagram.'] });
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <Head title="Diagrams" />

            <section className="space-y-6">
                <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">Diagrams</h1>
                            <p className="mt-1 text-sm text-slate-600">Manage your personal and team schema diagrams.</p>
                        </div>
                        <button
                            type="button"
                            onClick={openModal}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
                        >
                            + New diagram
                        </button>
                    </div>
                </div>

                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">My diagrams</h2>
                        {loading ? (
                            <p className="mt-4 text-sm text-slate-600">Loading diagrams…</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {myDiagrams.length === 0 && <p className="text-sm text-slate-500">No personal diagrams yet.</p>}
                                {myDiagrams.map((diagram) => (
                                    <Link
                                        key={diagram.id}
                                        href={`/diagrams/${diagram.id}`}
                                        className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50"
                                    >
                                        <p className="font-medium text-slate-900">{diagram.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">ID: {diagram.id}</p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Team diagrams</h2>
                        <div className="mt-4 space-y-4">
                            {teamGroups.length === 0 && !loading && (
                                <p className="text-sm text-slate-500">No team diagrams available.</p>
                            )}
                            {teamGroups.map((group) => (
                                <div key={group.teamName} className="rounded-xl border border-slate-200 p-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                                        {group.teamName}
                                    </h3>
                                    <div className="mt-3 space-y-2">
                                        {group.diagrams.map((diagram) => (
                                            <Link
                                                key={diagram.id}
                                                href={`/diagrams/${diagram.id}`}
                                                className="block rounded-lg bg-slate-50 px-3 py-2 text-sm transition hover:bg-indigo-50"
                                            >
                                                <p className="font-medium text-slate-900">{diagram.name}</p>
                                                <p className="text-xs text-slate-500">ID: {diagram.id}</p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900">Create new diagram</h3>
                        <form className="mt-4 space-y-4" onSubmit={submitCreateDiagram}>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                                <input
                                    value={createForm.name}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                    placeholder="e.g. Billing schema"
                                    required
                                />
                                {formErrors?.name?.[0] && <p className="mt-1 text-xs text-red-600">{formErrors.name[0]}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Owner type</label>
                                <select
                                    value={createForm.ownerType}
                                    onChange={(event) =>
                                        setCreateForm((current) => ({ ...current, ownerType: event.target.value }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                >
                                    <option value="personal">Personal</option>
                                    {supportsTeamOwner && <option value="team">Team</option>}
                                </select>
                            </div>

                            {supportsTeamOwner && createForm.ownerType === 'team' && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Team</label>
                                    <select
                                        value={createForm.teamId}
                                        onChange={(event) =>
                                            setCreateForm((current) => ({ ...current, teamId: event.target.value }))
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    >
                                        <option value="">Select team</option>
                                        {teams.map((team) => (
                                            <option key={team.id} value={team.id}>
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors?.owner_id?.[0] && (
                                        <p className="mt-1 text-xs text-red-600">{formErrors.owner_id[0]}</p>
                                    )}
                                </div>
                            )}

                            {formErrors?.general?.[0] && <p className="text-sm text-red-600">{formErrors.general[0]}</p>}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={creating}
                                    type="submit"
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                                >
                                    {creating ? 'Creating…' : 'Create diagram'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
