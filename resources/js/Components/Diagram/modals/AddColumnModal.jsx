import { useEffect } from 'react';
import { COLUMN_PRESETS, COLUMN_TYPE_OPTIONS } from '@/Components/Diagram/utils';

export default function AddColumnModal({ isOpen, mode = 'create', form, column, onChange, onClose, onSubmit, errors = {} }) {
    useEffect(() => {
        if (!isOpen || mode !== 'edit' || !column) {
            return;
        }

        onChange('name', column.name ?? '');
        onChange('type', column.type ?? 'VARCHAR(255)');
        onChange('nullable', Boolean(column.nullable));
        onChange('primary', Boolean(column.primary));
        onChange('unique', Boolean(column.unique));
        onChange('default', column.default ?? '');
        onChange('preset', '');
    }, [isOpen, mode, column, onChange]);

    if (!isOpen) {
        return null;
    }

    const applyPreset = (presetKey) => {
        const preset = COLUMN_PRESETS.find((entry) => entry.key === presetKey);

        if (!preset) {
            return;
        }

        onChange('preset', presetKey);
        onChange('name', preset.name);
        onChange('type', preset.type);
        onChange('nullable', preset.nullable);
        onChange('primary', preset.primary);
        onChange('unique', preset.unique);
        if (Object.prototype.hasOwnProperty.call(preset, 'default')) {
            onChange('default', preset.default ?? '');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">{mode === 'edit' ? 'Edit field' : 'Add field'}</h2>

                <form className="mt-4 space-y-4" onSubmit={onSubmit}>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Preset</label>
                        <select
                            value={form.preset}
                            onChange={(event) => applyPreset(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                            <option value="">Custom field</option>
                            {COLUMN_PRESETS.map((preset) => (
                                <option key={preset.key} value={preset.key}>
                                    {preset.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Field name</label>
                            <input
                                required
                                value={form.name}
                                onChange={(event) => onChange('name', event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                            <select
                                required
                                value={form.type}
                                onChange={(event) => onChange('type', event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                                {COLUMN_TYPE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Default (optional)</label>
                        <input
                            value={form.default}
                            onChange={(event) => onChange('default', event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                        {[
                            ['nullable', 'Nullable'],
                            ['primary', 'Primary key'],
                            ['unique', 'Unique'],
                        ].map(([field, label]) => (
                            <label key={field} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={Boolean(form[field])}
                                    onChange={(event) => onChange(field, event.target.checked)}
                                />
                                {label}
                            </label>
                        ))}
                    </div>

                    {(errors?.name?.[0] || errors?.general?.[0]) && (
                        <p className="text-sm text-red-600">{errors?.name?.[0] ?? errors?.general?.[0]}</p>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                            Cancel
                        </button>
                        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
                            {mode === 'edit' ? 'Save field' : 'Add field'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
