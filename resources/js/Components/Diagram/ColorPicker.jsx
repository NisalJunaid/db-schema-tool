import { TABLE_COLOR_OPTIONS } from '@/Components/Diagram/utils';

export default function ColorPicker({ value, onChange, disabled = false }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => onChange?.(null)}
                disabled={disabled}
                className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${
                    value
                        ? 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        : 'border-indigo-300 bg-indigo-50 text-indigo-700'
                } disabled:cursor-not-allowed disabled:opacity-40`}
            >
                Default
            </button>

            {TABLE_COLOR_OPTIONS.map((color) => (
                <button
                    key={color.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange?.(color.value)}
                    className={`h-5 w-5 rounded-full border-2 transition ${
                        value === color.value ? 'border-slate-900 scale-105' : 'border-white hover:scale-105'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                    style={{ backgroundColor: color.solid }}
                    title={color.label}
                />
            ))}
        </div>
    );
}
