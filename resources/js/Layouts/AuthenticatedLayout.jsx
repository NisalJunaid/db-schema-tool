import { Link, useForm, usePage } from '@inertiajs/react';
import AppLogo from '@/Components/AppLogo';

export default function AuthenticatedLayout({ children }) {
    const user = usePage().props.auth.user;
    const form = useForm({});

    const logout = (e) => {
        e.preventDefault();
        form.post('/logout');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="border-b bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                    <Link href="/dashboard" className="font-semibold text-gray-900">
                        <AppLogo className="h-10 w-auto" />
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{user?.email}</span>
                        <button
                            onClick={logout}
                            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
    );
}
