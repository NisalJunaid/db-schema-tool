import { Children, useEffect, useMemo, useRef, useState } from 'react';

export default function CarouselRow({ children, emptyState }) {
    const ref = useRef(null);
    const items = useMemo(() => Children.toArray(children).filter(Boolean), [children]);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [progress, setProgress] = useState(0);

    const refreshScrollState = () => {
        if (!ref.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = ref.current;
        const maxScroll = Math.max(scrollWidth - clientWidth, 1);
        setCanScrollLeft(scrollLeft > 4);
        setCanScrollRight(scrollLeft < maxScroll - 4);
        setProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    };

    useEffect(() => {
        refreshScrollState();
        const element = ref.current;
        if (!element) return undefined;
        element.addEventListener('scroll', refreshScrollState);
        window.addEventListener('resize', refreshScrollState);
        return () => {
            element.removeEventListener('scroll', refreshScrollState);
            window.removeEventListener('resize', refreshScrollState);
        };
    }, [items.length]);

    const scrollByPage = (dir) => {
        if (!ref.current) return;
        ref.current.scrollBy({ left: dir * Math.max(ref.current.clientWidth * 0.8, 280), behavior: 'smooth' });
    };

    if (!items.length) {
        return emptyState || null;
    }

    return (
        <div className="relative">
            {canScrollLeft && (
                <button
                    type="button"
                    onClick={() => scrollByPage(-1)}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-700 shadow transition hover:bg-white"
                    aria-label="Scroll left"
                >
                    <i className="fa-solid fa-chevron-left" />
                </button>
            )}

            <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {items}
            </div>

            {canScrollRight && (
                <button
                    type="button"
                    onClick={() => scrollByPage(1)}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-700 shadow transition hover:bg-white"
                    aria-label="Scroll right"
                >
                    <i className="fa-solid fa-chevron-right" />
                </button>
            )}

            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-indigo-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}
