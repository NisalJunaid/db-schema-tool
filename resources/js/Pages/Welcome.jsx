import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const user = usePage().props.auth.user;

    return (
        <>
            <Head title="Welcome" />
            <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
                <div className="w-full max-w-2xl rounded-xl bg-white p-10 shadow">
                    <h1 className="text-3xl font-bold text-gray-900">Laravel + Inertia + React</h1>
                    <p className="mt-3 text-gray-600">
                        Breeze-style authentication scaffolding is configured for this project.
                    </p>
                    <div className="mt-6 flex gap-3">
                        {user ? (
                            <Link href="/dashboard" className="rounded bg-indigo-600 px-4 py-2 text-white">
                                Go to dashboard
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="rounded bg-indigo-600 px-4 py-2 text-white">
                                    Login
                                </Link>
                                <Link href="/register" className="rounded border border-gray-300 px-4 py-2 text-gray-800">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
