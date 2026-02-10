import { Link } from '@inertiajs/react';

const baseButtonClass = 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

function IconButton({ title, onClick, icon, className = '', disabled = false }) {
    return (
        <button type="button" onClick={onClick} title={title} disabled={disabled} className={`${baseButtonClass} ${className}`.trim()}>
            <i className={`${icon} text-sm`} aria-hidden="true" />
            <span className="sr-only">{title}</span>
        </button>
    );
}

export default function Toolbar({ savingState, onSave, onImport, onExport, onExportImage, onNewDiagram, onOpenDiagram, onUndo, onRedo, canUndo, canRedo, onDeleteRelationship, canDeleteRelationship }) {
    return (
        <div className="sticky top-0 z-30 flex items-center border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-x-4">
                <div className="flex items-center gap-x-2">
                    <Link href="/diagrams" title="Back to diagrams" className={baseButtonClass}>
                        <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true" />
                        <span className="sr-only">Back to diagrams</span>
                    </Link>
                </div>

                <div className="flex items-center gap-x-2">
                    <IconButton title="Undo" onClick={onUndo} icon="fa-solid fa-rotate-left" disabled={!canUndo} />
                    <IconButton title="Redo" onClick={onRedo} icon="fa-solid fa-rotate-right" disabled={!canRedo} />
                </div>

                <div className="flex items-center gap-x-2">
                    <IconButton title="Save" onClick={onSave} icon="fa-solid fa-floppy-disk" className="border-indigo-300 text-indigo-700 hover:border-indigo-400" />
                </div>

                <div className="flex items-center gap-x-2">
                    <IconButton title="Import" onClick={onImport} icon="fa-solid fa-file-arrow-up" />
                    <IconButton title="Export" onClick={onExport} icon="fa-solid fa-file-arrow-down" />
                    <IconButton title="Export image" onClick={onExportImage} icon="fa-solid fa-image" />
                </div>

                <div className="flex items-center gap-x-2">
                    <IconButton title="New diagram" onClick={onNewDiagram} icon="fa-solid fa-file-circle-plus" />
                    <IconButton title="Open diagram" onClick={onOpenDiagram} icon="fa-solid fa-folder-open" />
                </div>

                <div className="flex items-center gap-x-2">
                    <IconButton title="Delete selected relationship" onClick={onDeleteRelationship} icon="fa-solid fa-trash" className="text-rose-600 hover:text-rose-700" disabled={!canDeleteRelationship} />
                </div>
            </div>

            <span className="ml-auto rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{savingState}</span>
        </div>
    );
}
