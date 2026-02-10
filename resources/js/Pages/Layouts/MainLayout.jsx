import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const navLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Diagrams', href: '/diagrams' },
];

export default function MainLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { url, props } = usePage();
    const authUser = props?.auth?.user;

    const submitLogout = () => {
        router.post('/logout');
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
                    <Link href="/dashboard" className="text-lg font-semibold text-indigo-700">
                        DB Schema Tool
                    </Link>

                    <div className="hidden items-center gap-2 md:flex">
                        <nav className="flex items-center gap-2">
                            {navLinks.map((item) => {
                                const active = url.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                                            active
                                                ? 'bg-indigo-600 text-white shadow'
                                                : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="ml-3 flex items-center gap-2 border-l border-slate-200 pl-3">
                            {authUser && <p className="text-sm font-medium text-slate-700">{authUser.name}</p>}

                            {authUser ? (
                                <button
                                    type="button"
                                    onClick={submitLogout}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Logout
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => router.get('/login')}
                                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                                >
                                    Login
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 md:hidden"
                        onClick={() => setMobileOpen((current) => !current)}
                    >
                        Menu
                    </button>
                </div>

                {mobileOpen && (
                    <nav className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 md:hidden">
                        {navLinks.map((item) => {
                            const active = url.startsWith(item.href);

                            return (
                                <Link
                                    key={`mobile-${item.href}`}
                                    href={item.href}
                                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                                        active ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                                    }`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}

                        <div className="mt-2 border-t border-slate-200 pt-2">
                            {authUser && <p className="mb-2 px-3 text-sm font-medium text-slate-700">{authUser.name}</p>}
                            {authUser ? (
                                <button
                                    type="button"
                                    onClick={submitLogout}
                                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700"
                                >
                                    Logout
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => router.get('/login')}
                                    className="block w-full rounded-lg bg-indigo-600 px-3 py-2 text-left text-sm font-semibold text-white"
                                >
                                    Login
                                </button>
                            )}
                        </div>
                    </nav>
                )}
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
    );
}
