import { useEffect } from 'react';

export default function Toast({ message, variant = 'info', onClose, duration = 3000 }) {
    useEffect(() => {
        if (!message) return undefined;
        const timer = window.setTimeout(() => onClose?.(), duration);
        return () => window.clearTimeout(timer);
    }, [duration, message, onClose]);

    if (!message) return null;

    const variants = {
        info: 'border-indigo-200 bg-indigo-50 text-indigo-800',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        error: 'border-red-200 bg-red-50 text-red-800',
    };

    return (
        <div className="fixed bottom-4 right-4 z-[70]">
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${variants[variant] || variants.info}`}>
                <p className="text-sm font-medium">{message}</p>
                <button type="button" onClick={() => onClose?.()} className="text-xs font-semibold opacity-70 transition hover:opacity-100">
                    Dismiss
                </button>
            </div>
        </div>
    );
}
