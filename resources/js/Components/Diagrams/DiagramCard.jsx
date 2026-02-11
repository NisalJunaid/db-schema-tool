import DiagramActionsMenu from './DiagramActionsMenu';

export default function DiagramCard({ diagram, onOpen, onRename, onToggleVisibility, onInvite, onManageAccess, onDelete }) {
    const previewUrl = diagram.preview_path
        ? `${diagram.preview_path}${diagram.updated_at ? `?v=${new Date(diagram.updated_at).getTime()}` : ''}`
        : diagram.preview_image;

    return (
        <div className="min-w-[280px] snap-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onClick={onOpen}>
            <div className="mb-3 h-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {previewUrl ? (
                    <img src={previewUrl} alt={`${diagram.name} preview`} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">No preview yet</div>
                )}
            </div>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h4 className="font-semibold text-slate-900">{diagram.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">Updated {new Date(diagram.updated_at).toLocaleString()}</p>
                </div>
                <DiagramActionsMenu
                    diagram={diagram}
                    onOpen={onOpen}
                    onRename={onRename}
                    onToggleVisibility={onToggleVisibility}
                    onInvite={onInvite}
                    onManageAccess={onManageAccess}
                    onDelete={onDelete}
                />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">{diagram.owner_label}</span>
                <span className={`rounded-full px-2 py-1 ${diagram.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {diagram.is_public ? 'Public' : 'Private'}
                </span>
            </div>
        </div>
    );
}
