import { Head, Link } from '@inertiajs/react';
import GuestMarketingLayout from '@/Layouts/GuestMarketingLayout';

const features = [
    {
        title: 'Visual Schema Builder',
        description: 'Drag, drop, connect fields.',
        icon: (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="7" height="7" rx="2" />
                <rect x="14" y="4" width="7" height="7" rx="2" />
                <rect x="8.5" y="13" width="7" height="7" rx="2" />
                <path d="M10 7.5h4M12 11v2" />
            </svg>
        ),
    },
    {
        title: 'Real-Time Collaboration',
        description: 'Live cursors, shared editing.',
        icon: (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M17 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M3 19a4 4 0 0 1 8 0M13 20a4 4 0 0 1 8 0" />
            </svg>
        ),
    },
    {
        title: 'Team-Based Access Control',
        description: 'Fine-grained diagram permissions.',
        icon: (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
                <path d="m9.5 12 2 2 3-3" />
            </svg>
        ),
    },
];

export default function Welcome() {
    return (
        <GuestMarketingLayout>
            <Head title="Forge — Collaborative Database Design" />

            <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:px-8 lg:pt-24">
                <div>
                    <p className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                        Built for modern product teams
                    </p>
                    <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                        Design Databases Visually. Collaborate in Real Time.
                    </h1>
                    <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
                        Forge helps teams model database schemas in a visual canvas, collaborate instantly, and ship
                        better architectures without losing alignment across product, engineering, and data.
                    </p>
                    <div className="mt-10 flex flex-wrap items-center gap-4">
                        <Link
                            href="/register"
                            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
                        >
                            Get Started
                        </Link>
                        <Link
                            href="/login"
                            className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                        >
                            Login
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xl shadow-indigo-100/60 sm:p-6">
                    <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-12 rounded-xl border border-indigo-200/80 bg-white/80" />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="h-20 rounded-xl border border-indigo-200/80 bg-white/80" />
                                <div className="h-20 rounded-xl border border-indigo-200/80 bg-white/80" />
                            </div>
                            <div className="h-28 rounded-xl border border-indigo-200/80 bg-white/80" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Everything your team needs to model faster</h2>
                    <p className="mt-4 text-gray-600">Forge combines visual clarity with collaboration tools designed for modern engineering teams.</p>
                </div>
                <div className="mt-12 grid gap-6 md:grid-cols-3">
                    {features.map((feature) => (
                        <article key={feature.title} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="inline-flex rounded-lg bg-indigo-50 p-3 text-indigo-600">{feature.icon}</div>
                            <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                            <p className="mt-2 text-gray-600">{feature.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 lg:grid-cols-2 lg:items-center lg:px-8">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Collaboration that feels effortless</h2>
                    <ul className="mt-8 space-y-4 text-gray-700">
                        {['Live cursors', 'Real-time updates', 'Shared diagrams', 'Team roles'].map((item) => (
                            <li key={item} className="flex items-center gap-3">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">✓</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-indigo-100/50">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700">Team Diagram Activity</p>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Live</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                                <span className="text-sm text-gray-600">users table updated</span>
                                <span className="text-xs text-gray-400">just now</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                                <span className="text-sm text-gray-600">orders relation connected</span>
                                <span className="text-xs text-gray-400">2m ago</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                                <span className="text-sm text-gray-600">permissions role changed</span>
                                <span className="text-xs text-gray-400">5m ago</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto w-full max-w-7xl px-6 pb-20 lg:px-8">
                <div className="rounded-2xl bg-gradient-to-r from-gray-900 via-indigo-900 to-indigo-700 px-8 py-12 text-center shadow-2xl shadow-indigo-900/30 sm:px-12">
                    <h2 className="text-3xl font-semibold text-white sm:text-4xl">Start Building with Forge Today</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-indigo-100">
                        Join teams designing clearer, faster, and more collaborative data architectures.
                    </p>
                    <Link
                        href="/register"
                        className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                    >
                        Create Free Account
                    </Link>
                </div>
            </section>

        </GuestMarketingLayout>
    );
}
