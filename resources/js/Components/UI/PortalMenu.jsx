import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

const MENU_OFFSET = 8;

export default function PortalMenu({ open, anchorEl, anchorRect, onClose, children, placement = 'bottom-end' }) {
    const menuRef = useRef(null);

    const rect = useMemo(() => {
        if (anchorRect) return anchorRect;
        if (anchorEl) return anchorEl.getBoundingClientRect();
        return null;
    }, [anchorEl, anchorRect]);

    useEffect(() => {
        if (!open) return undefined;

        const onPointerDown = (event) => {
            const target = event.target;
            if (menuRef.current?.contains(target) || anchorEl?.contains?.(target)) return;
            onClose?.();
        };

        const onEscape = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose?.();
            }
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onEscape);
        window.addEventListener('resize', onClose);
        window.addEventListener('scroll', onClose, true);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onEscape);
            window.removeEventListener('resize', onClose);
            window.removeEventListener('scroll', onClose, true);
        };
    }, [open, onClose, anchorEl]);

    if (!open || !rect) return null;

    const style = {
        position: 'fixed',
        top: rect.bottom + MENU_OFFSET,
        left: placement === 'bottom-end' ? undefined : rect.left,
        right: placement === 'bottom-end' ? Math.max(8, window.innerWidth - rect.right) : undefined,
        zIndex: 9999,
    };

    return createPortal(
        <div
            ref={menuRef}
            style={style}
            className="w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
        >
            {children}
        </div>,
        document.body,
    );
}
