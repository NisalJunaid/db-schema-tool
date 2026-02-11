import DiagramActionsMenu from './DiagramActionsMenu';

export default function DiagramCard({ diagram, onOpen, onRename, onToggleVisibility, onInvite, onManageAccess, onDelete }) {
    return (
        <div className="min-w-[280px] snap-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onClick={onOpen}>
            <div className="mb-3 h-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {diagram.preview_url ? (
                    <iframe
                        src={diagram.preview_url}
                        className="w-full h-40 rounded-md border"
                        title={`${diagram.name} preview`}
                    />
                ) : (
                    <div className="h-40 flex items-center justify-center text-slate-400">No preview</div>
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
