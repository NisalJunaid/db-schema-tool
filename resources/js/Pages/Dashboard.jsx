import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />

            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
                <p className="mt-2 text-slate-600">You are logged in and ready to manage schemas.</p>
            </div>
        </>
    );
}
