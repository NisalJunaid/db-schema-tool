import { useEffect, useState } from 'react';
import { COLUMN_PRESETS, COLUMN_TYPE_OPTIONS } from '@/Components/Diagram/utils';

const emptyColumnForm = {
    tableId: '',
    preset: '',
    name: '',
    type: 'VARCHAR(255)',
    nullable: false,
    primary: false,
    unique: false,
    default: '',
};

export default function AddColumnModal({ isOpen, mode = 'create', form, column, onClose, onSubmit, errors = {} }) {
    const [localForm, setLocalForm] = useState(form ?? emptyColumnForm);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (mode === 'edit' && column) {
            setLocalForm({
                tableId: String(column.diagram_table_id ?? form?.tableId ?? ''),
                preset: '',
                name: column.name ?? '',
                type: column.type ?? 'VARCHAR(255)',
                nullable: Boolean(column.nullable),
                primary: Boolean(column.primary),
                unique: Boolean(column.unique),
                default: column.default ?? '',
            });
            return;
        }

        setLocalForm(form ?? emptyColumnForm);
    }, [isOpen, mode, column, form]);

    if (!isOpen) {
        return null;
    }

    const setField = (field, value) => {
        setLocalForm((current) => ({ ...current, [field]: value }));
    };

    const applyPreset = (presetKey) => {
        const preset = COLUMN_PRESETS.find((entry) => entry.key === presetKey);

        if (!preset) {
            setField('preset', presetKey);
            return;
        }

        setLocalForm((current) => ({
            ...current,
            preset: presetKey,
            name: preset.name,
            type: preset.type,
            nullable: preset.nullable,
            primary: preset.primary,
            unique: preset.unique,
            default: Object.prototype.hasOwnProperty.call(preset, 'default') ? (preset.default ?? '') : current.default,
        }));
    };

    const handleSubmit = (event) => {
        onSubmit(event, localForm);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">{mode === 'edit' ? 'Edit field' : 'Add field'}</h2>

                <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Preset</label>
                        <select
                            value={localForm.preset}
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
                                value={localForm.name}
                                onChange={(event) => setField('name', event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                            <select
                                required
                                value={localForm.type}
                                onChange={(event) => setField('type', event.target.value)}
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
                            value={localForm.default}
                            onChange={(event) => setField('default', event.target.value)}
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
                                    checked={Boolean(localForm[field])}
                                    onChange={(event) => setField(field, event.target.checked)}
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
