import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

const navLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Diagrams', href: '/diagrams' },
];

export default function MainLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { url } = usePage();

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <header className="sticky top-0 z-30 border-b border-indigo-100 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link href="/dashboard" className="text-lg font-semibold text-indigo-700">
                        DB Schema Tool
                    </Link>
                    <button
                        type="button"
                        className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 md:hidden"
                        onClick={() => setMobileOpen((current) => !current)}
                    >
                        Menu
                    </button>
                    <nav className="hidden items-center gap-2 md:flex">
                        {navLinks.map((item) => {
                            const href = item.href;
                            const active = url.startsWith(href);

                            return (
                                <Link
                                    key={item.href}
                                    href={href}
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
                </div>

                {mobileOpen && (
                    <nav className="space-y-1 border-t border-indigo-100 bg-white px-4 py-3 md:hidden">
                        {navLinks.map((item) => {
                            const href = item.href;
                            const active = url.startsWith(href);

                            return (
                                <Link
                                    key={`mobile-${item.href}`}
                                    href={href}
                                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                                        active
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                                    }`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
    );
}
