import { Link } from '@inertiajs/react';

export default function Toolbar({ savingState, onSave, onImport, onExportSql, onExportMigrations, onExportImage, onNewDiagram, onOpenDiagram, onFitView }) {
    return (
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Link href="/diagrams" className="mr-3 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                ← Back to diagrams
            </Link>

            <button type="button" onClick={onSave} className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Save</button>
            <button type="button" onClick={onImport} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Import</button>
            <button type="button" onClick={onExportSql} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Export SQL</button>
            <button type="button" onClick={onExportMigrations} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Export migrations</button>
            <button type="button" onClick={onExportImage} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Export image</button>
            <button type="button" onClick={onNewDiagram} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">New diagram</button>
            <button type="button" onClick={onOpenDiagram} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Open diagram</button>
            <button type="button" onClick={onFitView} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Fit view</button>

            <span className="ml-auto rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{savingState}</span>
        </div>
    );
}
