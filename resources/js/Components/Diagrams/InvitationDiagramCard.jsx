const roleLabel = {
    viewer: 'Viewer',
    editor: 'Editor',
    admin: 'Admin',
};

export default function InvitationDiagramCard({ invitation, onAccept, onDecline, busyAction }) {
    const invitationType = `${invitation?.type || 'diagram'}`.toLowerCase();
    const isTeamInvite = invitationType === 'team';
    const diagramName = invitation?.diagram?.name || invitation?.diagram_name || (isTeamInvite ? invitation?.team?.name : 'Invitation to diagram');
    const previewUrl = invitation?.diagram?.preview_url || invitation?.diagram?.preview_path || invitation?.diagram?.preview_image || invitation?.diagram_preview;
    const role = `${invitation?.role || 'viewer'}`.toLowerCase();
    const isAccepting = busyAction === `accept-${invitation.id}`;
    const isDeclining = busyAction === `decline-${invitation.id}`;
    const isBusy = isAccepting || isDeclining;

    return (
        <article className={`group relative min-w-[280px] snap-start overflow-hidden rounded-xl border border-indigo-200 bg-slate-900 text-white shadow-sm transition-all duration-300 ${isBusy ? 'scale-[0.98] opacity-75' : 'opacity-100'}`}>
            <div className="h-48 w-full">
                {previewUrl ? (
                    <img src={previewUrl} alt={`${diagramName} preview`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-6 text-sm text-indigo-100">
                        {isTeamInvite ? 'Team invitation' : 'Diagram invitation'}
                    </div>
                )}
            </div>

            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/65 to-black/30 p-4 backdrop-blur-[1px]">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">{isTeamInvite ? 'Invited to join team' : 'Invited to collaborate'}</p>
                <h3 className="mt-1 line-clamp-2 text-lg font-semibold">{diagramName}</h3>
                <div className="mt-2 inline-flex w-fit rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    Role: {roleLabel[role] || role}
                </div>
                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onAccept(invitation)}
                        className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isAccepting ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onDecline(invitation)}
                        className="rounded-lg border border-white/30 bg-transparent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isDeclining ? 'Declining...' : 'Decline'}
                    </button>
                </div>
            </div>
        </article>
    );
}
