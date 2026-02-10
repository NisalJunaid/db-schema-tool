import { Link } from '@inertiajs/react';

const baseButtonClass = 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50';

function IconButton({ title, onClick, icon, className = '' }) {
    return (
        <button type="button" onClick={onClick} title={title} className={`${baseButtonClass} ${className}`.trim()}>
            <i className={`${icon} text-sm`} aria-hidden="true" />
            <span className="sr-only">{title}</span>
        </button>
    );
}

export default function Toolbar({ savingState, onSave, onImport, onExport, onExportImage, onNewDiagram, onOpenDiagram }) {
    return (
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Link href="/diagrams" title="Back to diagrams" className={baseButtonClass}>
                <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true" />
                <span className="sr-only">Back to diagrams</span>
            </Link>

            <IconButton title="Save" onClick={onSave} icon="fa-solid fa-floppy-disk" className="border-indigo-300 text-indigo-700 hover:border-indigo-400" />
            <IconButton title="Import" onClick={onImport} icon="fa-solid fa-file-arrow-up" />
            <IconButton title="Export" onClick={onExport} icon="fa-solid fa-file-arrow-down" />
            <IconButton title="Export image" onClick={onExportImage} icon="fa-solid fa-image" />
            <IconButton title="New diagram" onClick={onNewDiagram} icon="fa-solid fa-file-circle-plus" />
            <IconButton title="Open diagram" onClick={onOpenDiagram} icon="fa-solid fa-folder-open" />

            <span className="ml-auto rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{savingState}</span>
        </div>
    );
}
