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

const modeLabel = { db: 'Database Diagram', flow: 'Flowchart', mind: 'Mind Map' };

export default function Toolbar({
    savingState,
    onSave,
    onExport,
    onExportImage,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onDeleteSelection,
    canDeleteSelection,
    isViewOnly,
    editorMode,
    onEditorModeChange,
    canChangeMode,
    editMode,
    onToggleEditMode,
    showMiniMap,
    onToggleMiniMap,
    showGrid,
    onToggleGrid,
}) {
    return (
        <div className="sticky top-0 z-30 flex items-center border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-x-4">
                <div className="flex items-center gap-3">
                    <Link href="/diagrams" title="Back to diagrams" className={baseButtonClass}>
                        <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true" />
                    </Link>
                    <img src="/images/logo.png" alt="App Logo" className="h-8 w-auto" />
                </div>

                <select
                    value={editorMode}
                    onChange={(event) => onEditorModeChange(event.target.value)}
                    disabled={!canChangeMode}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:opacity-60"
                >
                    {Object.entries(modeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>

                <div className="flex items-center gap-x-2">
                    <IconButton title="Save" onClick={onSave} icon="fa-solid fa-floppy-disk" className="border-indigo-300 text-indigo-700 hover:border-indigo-400" />
                    <IconButton title="Undo" onClick={onUndo} icon="fa-solid fa-rotate-left" disabled={!canUndo} />
                    <IconButton title="Redo" onClick={onRedo} icon="fa-solid fa-rotate-right" disabled={!canRedo} />
                    <IconButton title="Delete selection" onClick={onDeleteSelection} icon="fa-solid fa-trash" className="text-rose-600 hover:text-rose-700" disabled={!canDeleteSelection} />
                    <IconButton title="Export" onClick={onExport} icon="fa-solid fa-file-arrow-down" />
                    <IconButton title="Export image" onClick={onExportImage} icon="fa-solid fa-image" />
                    <IconButton title={showMiniMap ? 'Hide minimap' : 'Show minimap'} onClick={onToggleMiniMap} icon="fa-regular fa-map" className={showMiniMap ? 'border-indigo-300 text-indigo-700' : ''} />
                    <IconButton title={showGrid ? 'Hide grid' : 'Show grid'} onClick={onToggleGrid} icon="fa-solid fa-border-all" className={showGrid ? 'border-indigo-300 text-indigo-700' : ''} />
                    {(editorMode === 'flow' || editorMode === 'mind' || editorMode === 'db') && (
                        <button
                            type="button"
                            onClick={onToggleEditMode}
                            className={`${baseButtonClass} ${editMode ? 'border-indigo-500 bg-indigo-600 text-white hover:border-indigo-600 hover:bg-indigo-700' : ''}`}
                            title="Edit mode"
                        >
                            <i className="fa-solid fa-pen-to-square text-sm" aria-hidden="true" />
                            <span className="sr-only">Edit mode</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
                {isViewOnly && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">View only</span>}
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{savingState} · {modeLabel[editorMode]}</span>
            </div>
        </div>
    );
}
