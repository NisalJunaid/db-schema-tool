import { useState } from 'react';

export default function DiagramActionsMenu({ diagram, onOpen, onRename, onToggleVisibility, onInvite, onManageAccess, onDelete }) {
    const [open, setOpen] = useState(false);

    const handle = (action) => {
        setOpen(false);
        action?.();
    };

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-md px-2 py-1 hover:bg-slate-100">
                <i className="fa-solid fa-ellipsis-vertical" />
            </button>
            {open && (
                <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow">
                    <button type="button" onClick={() => handle(onOpen)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">Open</button>
                    <button type="button" onClick={() => handle(onRename)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">Rename</button>
                    <button type="button" onClick={() => handle(onToggleVisibility)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-slate-100">
                        <span>Toggle Public/Private</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${diagram?.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{diagram?.is_public ? 'Public' : 'Private'}</span>
                    </button>
                    <button type="button" onClick={() => handle(onInvite)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">Invite Collaborator</button>
                    <button type="button" onClick={() => handle(onManageAccess)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">Manage Access</button>
                    <button type="button" onClick={() => handle(onDelete)} className="block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
                </div>
            )}
        </div>
    );
}
