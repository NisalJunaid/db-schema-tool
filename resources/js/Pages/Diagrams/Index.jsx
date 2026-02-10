import { Head, Link } from '@inertiajs/react';

const personalDiagrams = [
    { id: 101, name: 'Customer Portal Schema', updated_at: 'Updated 2h ago' },
    { id: 102, name: 'Billing Service Data Model', updated_at: 'Updated yesterday' },
];

const teamDiagramGroups = [
    {
        team: 'Product Team',
        diagrams: [
            { id: 201, name: 'Analytics Warehouse', updated_at: 'Updated 3h ago' },
            { id: 202, name: 'Growth Experiment Tracking', updated_at: 'Updated last week' },
        ],
    },
    {
        team: 'Platform Team',
        diagrams: [{ id: 203, name: 'Auth + Permissions Core', updated_at: 'Updated 4 days ago' }],
    },
];

export default function DiagramsIndex() {
    return (
        <>
            <Head title="Diagrams" />

            <section className="space-y-6">
                <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">Diagrams</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                Manage your personal and team schema diagrams.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
                        >
                            + New Diagram
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Personal diagrams</h2>
                        <div className="mt-4 space-y-3">
                            {personalDiagrams.map((diagram) => (
                                <Link
                                    key={diagram.id}
                                    href={`/diagrams/${diagram.id}`}
                                    className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50"
                                >
                                    <p className="font-medium text-slate-900">{diagram.name}</p>
                                    <p className="mt-1 text-xs text-slate-500">{diagram.updated_at}</p>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Team diagrams</h2>
                        <div className="mt-4 space-y-4">
                            {teamDiagramGroups.map((group) => (
                                <div key={group.team} className="rounded-xl border border-slate-200 p-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                                        {group.team}
                                    </h3>
                                    <div className="mt-3 space-y-2">
                                        {group.diagrams.map((diagram) => (
                                            <Link
                                                key={diagram.id}
                                                href={`/diagrams/${diagram.id}`}
                                                className="block rounded-lg bg-slate-50 px-3 py-2 text-sm transition hover:bg-indigo-50"
                                            >
                                                <p className="font-medium text-slate-900">{diagram.name}</p>
                                                <p className="text-xs text-slate-500">{diagram.updated_at}</p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
