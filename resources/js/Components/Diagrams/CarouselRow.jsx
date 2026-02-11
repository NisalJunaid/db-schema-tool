import { useRef } from 'react';

export default function CarouselRow({ children }) {
    const ref = useRef(null);

    const scrollBy = (dir) => {
        ref.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
    };

    return (
        <div className="relative">
            <button type="button" onClick={() => scrollBy(-1)} className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow">
                <i className="fa-solid fa-chevron-left" />
            </button>
            <div ref={ref} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-8 pb-2">
                {children}
            </div>
            <button type="button" onClick={() => scrollBy(1)} className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow">
                <i className="fa-solid fa-chevron-right" />
            </button>
        </div>
    );
}
