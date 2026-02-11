import DiagramActionsMenu from './DiagramActionsMenu';

export default function DiagramCard({ diagram, onOpen, onRename, onDuplicate, onShare, onDelete }) {
    return (
        <div className="min-w-[260px] snap-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h4 className="font-semibold text-slate-900">{diagram.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">Updated {new Date(diagram.updated_at).toLocaleString()}</p>
                </div>
                <DiagramActionsMenu
                    onOpen={onOpen}
                    onRename={onRename}
                    onDuplicate={onDuplicate}
                    onShare={onShare}
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
