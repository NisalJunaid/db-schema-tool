import { Head } from '@inertiajs/react';

export default function DiagramEditor({ diagramId }) {
    return (
        <>
            <Head title={`Diagram ${diagramId}`} />

            <section className="space-y-6">
                <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-900">Diagram Editor</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Diagram ID: <span className="font-semibold text-indigo-700">{diagramId}</span>
                    </p>
                </div>

                <div className="rounded-2xl border border-dashed border-indigo-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                        <span className="text-xl">⏳</span>
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">React Flow canvas loading</h2>
                    <p className="mt-2 text-sm text-slate-600">Loading… editor integration is coming next.</p>
                </div>
            </section>
        </>
    );
}
