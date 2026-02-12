import { Link } from '@inertiajs/react';
import AppLogo from '@/Components/AppLogo';

export default function GuestMarketingLayout({ children }) {
    const currentYear = new Date().getFullYear();

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-indigo-50/30 to-white text-gray-900">
            <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/85 backdrop-blur">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
                    <Link href="/" className="inline-flex items-center">
                        <AppLogo className="h-9 w-auto" />
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
                        >
                            Login
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:bg-indigo-500"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </header>

            <main>{children}</main>

            <footer className="border-t border-gray-200 bg-white/70">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-8 text-sm text-gray-500 lg:px-8">
                    © {currentYear} Forge. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
