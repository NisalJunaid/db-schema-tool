export default function ExportModal({ open, onClose, onExportSql, onExportMigrations, onExportJson, editorMode }) {
    if (!open) {
        return null;
    }

    const isDb = editorMode === 'db';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">Export diagram</h2>
                <p className="mt-1 text-sm text-slate-500">{isDb ? 'Choose one of the available export formats.' : 'Export current canvas as JSON.'}</p>

                <div className="mt-4 grid gap-2">
                    {isDb && (
                        <>
                            <button type="button" onClick={onExportSql} className="rounded-lg border border-slate-300 px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Export SQL
                            </button>
                            <button type="button" onClick={onExportMigrations} className="rounded-lg border border-slate-300 px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Export Laravel migrations
                            </button>
                        </>
                    )}
                    <button type="button" onClick={onExportJson} className="rounded-lg border border-slate-300 px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Export JSON
                    </button>
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
