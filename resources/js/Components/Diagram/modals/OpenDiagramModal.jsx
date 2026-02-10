export default function OpenDiagramModal({ open, diagrams = [], onClose, onOpen }) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">Open diagram</h2>
                <div className="mt-4 max-h-80 overflow-y-auto">
                    {diagrams.map((diagram) => (
                        <button
                            type="button"
                            key={diagram.id}
                            onClick={() => onOpen(diagram)}
                            className="mb-2 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                        >
                            <span className="font-medium text-slate-800">{diagram.name}</span>
                            <span className="text-xs text-slate-500">#{diagram.id}</span>
                        </button>
                    ))}
                    {!diagrams.length && <p className="text-sm text-slate-500">No diagrams found.</p>}
                </div>
                <div className="mt-5 flex justify-end">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
