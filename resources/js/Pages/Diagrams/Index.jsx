import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

const extractPersonalDiagrams = (payload) => {
    if (Array.isArray(payload?.personalDiagrams)) {
        return payload.personalDiagrams;
    }

    if (Array.isArray(payload?.personal_diagrams)) {
        return payload.personal_diagrams;
    }

    if (Array.isArray(payload?.personal)) {
        return payload.personal;
    }

    if (Array.isArray(payload?.diagrams)) {
        return payload.diagrams.filter((diagram) => !diagram?.team_id && !diagram?.team);
    }

    return [];
};

const extractTeamGroups = (payload) => {
    const grouped = new Map();

    const groups = payload?.teamDiagrams ?? payload?.team_diagrams ?? payload?.teams;

    if (Array.isArray(groups)) {
        groups.forEach((teamGroup) => {
            if (!teamGroup) {
                return;
            }

            const team = teamGroup.team ?? {
                id: teamGroup.team_id ?? teamGroup.id,
                name: teamGroup.team_name ?? teamGroup.name,
            };

            const diagrams = teamGroup.diagrams ?? teamGroup.items ?? [];

            if (team?.id) {
                grouped.set(team.id, {
                    team,
                    diagrams: Array.isArray(diagrams) ? diagrams : [],
                });
            }
        });
    }

    if (Array.isArray(payload?.diagrams)) {
        payload.diagrams
            .filter((diagram) => diagram?.team_id || diagram?.team)
            .forEach((diagram) => {
                const team = diagram.team ?? {
                    id: diagram.team_id,
                    name: diagram.team_name,
                };

                if (!team?.id) {
                    return;
                }

                if (!grouped.has(team.id)) {
                    grouped.set(team.id, { team, diagrams: [] });
                }

                grouped.get(team.id).diagrams.push(diagram);
            });
    }

    return Array.from(grouped.values()).sort((a, b) =>
        String(a.team?.name ?? '').localeCompare(String(b.team?.name ?? ''))
    );
};

const diagramDisplayName = (diagram) => diagram?.name ?? diagram?.title ?? `Diagram #${diagram?.id}`;

export default function DiagramsIndex() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [personalDiagrams, setPersonalDiagrams] = useState([]);
    const [teamDiagramGroups, setTeamDiagramGroups] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        ownerType: 'personal',
        teamId: '',
    });

    const availableTeams = useMemo(
        () =>
            teamDiagramGroups
                .map(({ team }) => team)
                .filter((team) => team?.id)
                .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''))),
        [teamDiagramGroups]
    );

    const loadDiagrams = async () => {
        setLoading(true);
        setError('');

        try {
            const { data } = await window.axios.get('/api/diagrams');
            setPersonalDiagrams(extractPersonalDiagrams(data));
            setTeamDiagramGroups(extractTeamGroups(data));
        } catch (fetchError) {
            setError(fetchError?.response?.data?.message ?? 'Unable to load diagrams right now.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDiagrams();
    }, []);

    const onFieldChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: value,
            ...(name === 'ownerType' && value === 'personal' ? { teamId: '' } : {}),
        }));
    };

    const onCreateDiagram = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            await window.axios.post('/api/diagrams', {
                name: formData.name,
                owner_type: formData.ownerType,
                team_id: formData.ownerType === 'team' ? formData.teamId : null,
            });

            setFormData({ name: '', ownerType: 'personal', teamId: '' });
            await loadDiagrams();
        } catch (saveError) {
            setError(saveError?.response?.data?.message ?? 'Unable to create diagram right now.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Diagrams" />

            <div className="space-y-6">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold text-gray-900">Diagrams</h1>
                    <p className="mt-2 text-gray-600">
                        Create and manage personal diagrams, plus team diagrams grouped by team.
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Create New Diagram</h2>
                    <form onSubmit={onCreateDiagram} className="mt-4 grid gap-4 md:grid-cols-3">
                        <div className="md:col-span-3">
                            <label className="text-sm font-medium text-gray-700" htmlFor="name">
                                Diagram Name
                            </label>
                            <TextInput
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={onFieldChange}
                                required
                                placeholder="e.g. Payments Service Schema"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700" htmlFor="ownerType">
                                Owner Type
                            </label>
                            <select
                                id="ownerType"
                                name="ownerType"
                                value={formData.ownerType}
                                onChange={onFieldChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="personal">Personal</option>
                                <option value="team">Team</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700" htmlFor="teamId">
                                Team
                            </label>
                            <select
                                id="teamId"
                                name="teamId"
                                value={formData.teamId}
                                onChange={onFieldChange}
                                disabled={formData.ownerType !== 'team'}
                                required={formData.ownerType === 'team'}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                            >
                                <option value="">Select a team</option>
                                {availableTeams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name ?? `Team #${team.id}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <PrimaryButton disabled={saving} className="w-full justify-center">
                                {saving ? 'Creating...' : 'Create Diagram'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900">Personal Diagrams</h2>
                        {loading ? (
                            <p className="mt-3 text-gray-500">Loading personal diagrams...</p>
                        ) : personalDiagrams.length ? (
                            <ul className="mt-4 space-y-2">
                                {personalDiagrams.map((diagram) => (
                                    <li key={diagram.id} className="rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-800">
                                        {diagramDisplayName(diagram)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-3 text-gray-500">No personal diagrams yet.</p>
                        )}
                    </section>

                    <section className="rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900">Team Diagrams</h2>
                        {loading ? (
                            <p className="mt-3 text-gray-500">Loading team diagrams...</p>
                        ) : teamDiagramGroups.length ? (
                            <div className="mt-4 space-y-4">
                                {teamDiagramGroups.map(({ team, diagrams }) => (
                                    <div key={team.id}>
                                        <h3 className="text-sm font-semibold text-gray-700">
                                            {team.name ?? `Team #${team.id}`}
                                        </h3>
                                        {diagrams.length ? (
                                            <ul className="mt-2 space-y-2">
                                                {diagrams.map((diagram) => (
                                                    <li
                                                        key={diagram.id}
                                                        className="rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-800"
                                                    >
                                                        {diagramDisplayName(diagram)}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="mt-2 text-sm text-gray-500">No diagrams for this team.</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-gray-500">No team diagrams yet.</p>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
