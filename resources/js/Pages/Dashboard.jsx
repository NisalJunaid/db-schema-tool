import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Dashboard() {
    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-gray-600">You are logged in.</p>
            </div>
        </AuthenticatedLayout>
    );
}
