import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppLogo from '@/Components/AppLogo';

const leftNav = [
    { label: 'Diagrams', href: '/diagrams', icon: 'fa-diagram-project' },
    { label: 'Teams', href: '/teams', icon: 'fa-people-group' },
    { label: 'Invitations', href: '/invitations', icon: 'fa-envelope-open-text' },
];

export default function MainLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { url, props } = usePage();
    const authUser = props?.auth?.user;
    const pendingInvitations = Number(props?.pendingInvitations ?? 0);
    const isAdmin = ['admin', 'super_admin'].includes(authUser?.role);

    const submitLogout = () => router.post('/logout');

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="inline-flex items-center">
                            <AppLogo className="h-10 w-auto" />
                        </Link>
                        <nav className="hidden items-center gap-1 md:flex">
                            {leftNav.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`rounded-lg px-3 py-2 text-sm ${url.startsWith(item.href) ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-indigo-50'}`}
                                >
                                    <i className={`fa-solid ${item.icon} mr-2`} />
                                    {item.label}
                                    {item.href === '/invitations' && pendingInvitations > 0 && (
                                        <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">{pendingInvitations}</span>
                                    )}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="hidden items-center gap-2 md:flex">
                        <button type="button" onClick={() => setDropdownOpen((current) => !current)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                            <i className="fa-solid fa-user mr-2" />
                            {authUser?.name}
                            <i className="fa-solid fa-chevron-down ml-2 text-xs" />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute right-8 top-16 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                <Link href="/profile" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100"><i className="fa-solid fa-id-card mr-2" />Profile</Link>
                                <Link href="/teams" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100"><i className="fa-solid fa-people-group mr-2" />Team Management</Link>
                                {isAdmin && (
                                    <Link href="/admin/users" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100"><i className="fa-solid fa-user-shield mr-2" />User Management</Link>
                                )}
                                <button type="button" onClick={submitLogout} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"><i className="fa-solid fa-right-from-bracket mr-2" />Logout</button>
                            </div>
                        )}
                    </div>

                    <button type="button" className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 md:hidden" onClick={() => setMobileOpen((current) => !current)}>
                        <i className="fa-solid fa-bars mr-2" /> Menu
                    </button>
                </div>

                {mobileOpen && (
                    <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 md:hidden">
                        {leftNav.map((item) => (
                            <Link key={`mobile-${item.href}`} href={item.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-indigo-50"><i className={`fa-solid ${item.icon} mr-2`} />{item.label}</Link>
                        ))}
                        <Link href="/profile" className="block rounded-lg px-3 py-2 text-sm hover:bg-indigo-50"><i className="fa-solid fa-id-card mr-2" />Profile</Link>
                        <Link href="/teams" className="block rounded-lg px-3 py-2 text-sm hover:bg-indigo-50"><i className="fa-solid fa-people-group mr-2" />Team Management</Link>
                        {isAdmin && (
                            <Link href="/admin/users" className="block rounded-lg px-3 py-2 text-sm hover:bg-indigo-50"><i className="fa-solid fa-user-shield mr-2" />User Management</Link>
                        )}
                        <button type="button" onClick={submitLogout} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50"><i className="fa-solid fa-right-from-bracket mr-2" />Logout</button>
                    </div>
                )}
            </header>

            {pendingInvitations > 0 && (
                <div className="border-b border-amber-200 bg-amber-50">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
                        <span>You have pending invitations waiting for action.</span>
                        <Link href="/invitations" className="font-semibold text-indigo-700 hover:underline">View invitations</Link>
                    </div>
                </div>
            )}

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
    );
}
