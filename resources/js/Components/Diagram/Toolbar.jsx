import { Link } from '@inertiajs/react';
import AppLogo from '@/Components/AppLogo';

const baseButtonClass = 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

function IconButton({ title, onClick, icon, className = '', disabled = false }) {
    return (
        <button type="button" onClick={onClick} title={title} disabled={disabled} className={`${baseButtonClass} ${className}`.trim()}>
            <i className={`${icon} text-sm`} aria-hidden="true" />
            <span className="sr-only">{title}</span>
        </button>
    );
}

export default function Toolbar({
    savingState,
    onSave,
    onImport,
    onExport,
    onExportImage,
    onNewDiagram,
    onOpenDiagram,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onDeleteSelection,
    canDeleteSelection,
    showMiniMap,
    showGrid,
    onToggleMiniMap,
    onToggleGrid,
    canManageAccess,
    onManageAccess,
    isViewOnly,
}) {
    return (
        <div className="sticky top-0 z-30 flex items-center border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-x-4">
                <div className="flex items-center gap-3">
                    <Link href="/diagrams" title="Back to diagrams" className={baseButtonClass}>
                        <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true" />
                        <span className="sr-only">Back to diagrams</span>
                    </Link>
                    <AppLogo className="h-8 w-auto" />
                </div>

                <div className="flex items-center gap-x-2">
                    <IconButton title="Undo" onClick={onUndo} icon="fa-solid fa-rotate-left" disabled={!canUndo} />
                    <IconButton title="Redo" onClick={onRedo} icon="fa-solid fa-rotate-right" disabled={!canRedo} />
                </div>

                <div className="flex items-center gap-x-2">
                    <IconButton title="Save" onClick={onSave} icon="fa-solid fa-floppy-disk" className="border-indigo-300 text-indigo-700 hover:border-indigo-400" />
                    {canManageAccess && <IconButton title="Manage access" onClick={onManageAccess} icon="fa-solid fa-user-shield" />}
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
                    <IconButton title="Delete selection" onClick={onDeleteSelection} icon="fa-solid fa-trash" className="text-rose-600 hover:text-rose-700" disabled={!canDeleteSelection} />
                </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
                {isViewOnly && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">View only</span>}
                <IconButton
                    title="Toggle minimap"
                    onClick={onToggleMiniMap}
                    icon="fa-solid fa-map"
                    className={showMiniMap ? 'border-indigo-300 text-indigo-700' : ''}
                />
                <IconButton
                    title="Toggle grid"
                    onClick={onToggleGrid}
                    icon="fa-solid fa-border-all"
                    className={showGrid ? 'border-indigo-300 text-indigo-700' : ''}
                />
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{savingState}</span>
            </div>
        </div>
    );
}
