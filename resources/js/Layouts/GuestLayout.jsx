export default function GuestLayout({ title, children }) {
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
                <div className="w-full rounded-xl bg-white p-8 shadow">
                    <h1 className="mb-6 text-2xl font-semibold text-gray-900">{title}</h1>
                    {children}
                </div>
            </div>
        </div>
    );
}
