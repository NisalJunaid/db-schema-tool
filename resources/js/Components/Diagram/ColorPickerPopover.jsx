import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ColorPicker from '@/Components/Diagram/ColorPicker';

export default function ColorPickerPopover({ open, anchorRect, colors, value, onSelect, onClose }) {
    const popoverRef = useRef(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onMouseDown = (event) => {
            if (popoverRef.current?.contains(event.target)) {
                return;
            }
            onClose?.();
        };

        const onEscape = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onEscape);

        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onEscape);
        };
    }, [open, onClose]);

    if (!open || !anchorRect) {
        return null;
    }

    const top = anchorRect.bottom + 8;
    const left = Math.max(8, anchorRect.right - 192);

    return createPortal(
        <div
            ref={popoverRef}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="fixed z-[1200] w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-xl"
            style={{ top, left }}
        >
            <ColorPicker colors={colors} value={value ?? null} onChange={onSelect} />
        </div>,
        document.body,
    );
}
