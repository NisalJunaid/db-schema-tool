import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MENU_OFFSET = 8;
const VIEWPORT_PADDING = 8;

export default function PortalMenu({ open, anchorEl, anchorRect, onClose, children }) {
    const menuRef = useRef(null);
    const [menuStyle, setMenuStyle] = useState(null);
    const [arrowStyle, setArrowStyle] = useState(null);

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

    useLayoutEffect(() => {
        if (!open || !rect || !menuRef.current) {
            setMenuStyle(null);
            setArrowStyle(null);
            return;
        }

        const menuRect = menuRef.current.getBoundingClientRect();
        const menuWidth = menuRect.width;
        const menuHeight = menuRect.height;

        let left = rect.right - menuWidth;
        let top = rect.bottom + MENU_OFFSET;
        let opensUpward = false;

        if (left < VIEWPORT_PADDING) {
            left = VIEWPORT_PADDING;
        }

        if (left + menuWidth > window.innerWidth - VIEWPORT_PADDING) {
            left = window.innerWidth - menuWidth - VIEWPORT_PADDING;
        }

        if (top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
            top = rect.top - menuHeight - MENU_OFFSET;
            opensUpward = true;
        }

        if (top < VIEWPORT_PADDING) {
            top = VIEWPORT_PADDING;
        }

        const anchorCenter = rect.left + (rect.width / 2);
        const arrowLeft = Math.max(12, Math.min(menuWidth - 12, anchorCenter - left));

        setMenuStyle({
            position: 'fixed',
            left,
            top,
            zIndex: 9999,
        });
        setArrowStyle({
            left: arrowLeft,
            [opensUpward ? 'bottom' : 'top']: -5,
        });
    }, [open, rect]);

    if (!open || !rect) return null;

    return createPortal(
        <div
            ref={menuRef}
            style={menuStyle ?? { position: 'fixed', left: -9999, top: -9999 }}
            className="relative w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
        >
            {arrowStyle && (
                <span
                    className="absolute h-2.5 w-2.5 rotate-45 border border-slate-200 bg-white"
                    style={arrowStyle}
                    aria-hidden="true"
                />
            )}
            <div className="relative z-10">{children}</div>
        </div>,
        document.body,
    );
}
