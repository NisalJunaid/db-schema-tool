import { useRef, useState } from 'react';
import PortalMenu from '@/Components/UI/PortalMenu';

export default function DiagramActionsMenu({ diagram, onOpen, onRename, onToggleVisibility, onInvite, onManageAccess, onDelete }) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);

    const canManageAccess = Boolean(diagram?.permissions?.canManageAccess);
    const canDelete = Boolean(diagram?.permissions?.canDelete);
    const canEdit = Boolean(diagram?.permissions?.canEdit);

    const handle = (action) => {
        setOpen(false);
        action?.();
    };

    return (
        <div className="relative" onClick={(event) => event.stopPropagation()}>
            <button
                ref={anchorRef}
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((v) => !v);
                }}
                className="rounded-md px-2 py-1 hover:bg-slate-100"
            >
                <i className="fa-solid fa-ellipsis-vertical" />
            </button>
            <PortalMenu open={open} anchorEl={anchorRef.current} onClose={() => setOpen(false)}>
                <button type="button" onClick={() => handle(onOpen)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">Open</button>
                {canEdit && <button type="button" onClick={() => handle(onRename)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">Rename</button>}
                {canManageAccess && (
                    <>
                        <button type="button" onClick={() => handle(onToggleVisibility)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-slate-100">
                            <span>Toggle Public/Private</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${diagram?.is_public ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{diagram?.is_public ? 'Public' : 'Private'}</span>
                        </button>
                        <button type="button" onClick={() => handle(onInvite)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">Invite Collaborator</button>
                        <button type="button" onClick={() => handle(onManageAccess)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">Share View Link</button>
                    </>
                )}
                {canDelete && <button type="button" onClick={() => handle(onDelete)} className="block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>}
            </PortalMenu>
        </div>
    );
}
