import { useEffect, useMemo, useState } from 'react';
import { COLUMN_PRESETS, COLUMN_TYPE_OPTIONS, formatColumnType } from '@/Components/Diagram/utils';

const emptyColumnForm = {
    tableId: '',
    preset: '',
    name: '',
    type: 'VARCHAR',
    enum_values: [],
    length: 255,
    precision: 10,
    scale: 2,
    unsigned: false,
    auto_increment: false,
    nullable: false,
    primary: false,
    unique: false,
    index_type: '',
    default: '',
    collation: '',
};

const NUMERIC_TYPES = ['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT', 'DECIMAL', 'FLOAT', 'DOUBLE'];

const parseTypeMetadata = (column = {}) => {
    const rawType = String(column.type ?? 'VARCHAR').trim();
    const upper = rawType.toUpperCase();
    const enumMatch = upper.match(/^ENUM\s*\((.*)\)$/i);
    const varcharMatch = upper.match(/^VARCHAR\s*\((\d+)\)$/i);
    const decimalMatch = upper.match(/^DECIMAL\s*\((\d+)\s*,\s*(\d+)\)$/i);

    let type = upper;
    let enumValues = Array.isArray(column.enum_values) ? column.enum_values : [];
    let length = column.length ?? null;
    let precision = column.precision ?? null;
    let scale = column.scale ?? null;

    if (enumMatch) {
        type = 'ENUM';
        enumValues = enumMatch[1]
            .split(',')
            .map((value) => value.trim().replace(/^'(.*)'$/, '$1'))
            .filter(Boolean);
    } else if (varcharMatch) {
        type = 'VARCHAR';
        length = Number(varcharMatch[1]);
    } else if (decimalMatch) {
        type = 'DECIMAL';
        precision = Number(decimalMatch[1]);
        scale = Number(decimalMatch[2]);
    }

    if (upper.endsWith(' UNSIGNED') && !column.unsigned) {
        type = type.replace(/\s+UNSIGNED$/, '');
    }

    return { type: type.replace(/\s+UNSIGNED$/, ''), enumValues, length, precision, scale };
};

export default function AddColumnModal({ isOpen, mode = 'create', form, column, onClose, onSubmit, errors = {} }) {
    const [localForm, setLocalForm] = useState(form ?? emptyColumnForm);

    useEffect(() => {
        if (!isOpen) return;

        if (mode === 'edit' && column) {
            const parsed = parseTypeMetadata(column);
            setLocalForm({
                tableId: String(column.diagram_table_id ?? form?.tableId ?? ''),
                preset: '',
                name: column.name ?? '',
                type: parsed.type,
                enum_values: parsed.enumValues,
                length: parsed.length ?? column.length ?? 255,
                precision: parsed.precision ?? column.precision ?? 10,
                scale: parsed.scale ?? column.scale ?? 2,
                unsigned: Boolean(column.unsigned || String(column.type ?? '').toUpperCase().includes('UNSIGNED')),
                auto_increment: Boolean(column.auto_increment),
                nullable: Boolean(column.nullable),
                primary: Boolean(column.primary),
                unique: Boolean(column.unique),
                index_type: column.index_type ?? (column.primary ? 'primary' : (column.unique ? 'unique' : '')),
                default: column.default ?? '',
                collation: column.collation ?? '',
            });
            return;
        }

        setLocalForm({ ...emptyColumnForm, ...(form ?? {}) });
    }, [isOpen, mode, column, form]);

    const isNumericType = useMemo(() => NUMERIC_TYPES.includes(String(localForm.type).toUpperCase()), [localForm.type]);

    if (!isOpen) return null;

    const setField = (field, value) => setLocalForm((current) => ({ ...current, [field]: value }));

    const setType = (type) => {
        setLocalForm((current) => {
            const next = { ...current, type };
            if (type !== 'ENUM') next.enum_values = [];
            if (type !== 'VARCHAR') next.length = 255;
            if (type !== 'DECIMAL') {
                next.precision = 10;
                next.scale = 2;
            }
            if (!NUMERIC_TYPES.includes(type)) {
                next.unsigned = false;
                next.auto_increment = false;
            }
            return next;
        });
    };

    const applyPreset = (presetKey) => {
        const preset = COLUMN_PRESETS.find((entry) => entry.key === presetKey);
        if (!preset) return setField('preset', presetKey);
        const parsed = parseTypeMetadata(preset);
        setLocalForm((current) => ({
            ...current,
            preset: presetKey,
            name: preset.name,
            type: parsed.type,
            nullable: preset.nullable,
            primary: preset.primary,
            unique: preset.unique,
            default: Object.prototype.hasOwnProperty.call(preset, 'default') ? (preset.default ?? '') : current.default,
        }));
    };

    const updateEnumValue = (index, value) => {
        setLocalForm((current) => {
            const nextValues = [...(current.enum_values ?? [])];
            nextValues[index] = value;
            return { ...current, enum_values: nextValues };
        });
    };

    const sqlTypePreview = formatColumnType(localForm);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">{mode === 'edit' ? 'Edit field' : 'Add field'}</h2>
                <form className="mt-4 space-y-4" onSubmit={(event) => onSubmit(event, localForm)}>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Preset</label>
                        <select value={localForm.preset} onChange={(event) => applyPreset(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                            <option value="">Custom field</option>
                            {COLUMN_PRESETS.map((preset) => <option key={preset.key} value={preset.key}>{preset.label}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Field name</label>
                            <input required value={localForm.name} onChange={(event) => setField('name', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                            <select required value={localForm.type} onChange={(event) => setType(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                {COLUMN_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500">Preview: {sqlTypePreview}</p>

                    {localForm.type === 'ENUM' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Enum values</label>
                            {(localForm.enum_values ?? []).map((value, index) => (
                                <div key={index} className="flex gap-2">
                                    <input value={value} onChange={(event) => updateEnumValue(index, event.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                                    <button type="button" onClick={() => setLocalForm((current) => ({ ...current, enum_values: (current.enum_values ?? []).filter((_, rowIndex) => rowIndex !== index) }))} className="rounded border border-rose-300 px-2 text-rose-600">−</button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setLocalForm((current) => ({ ...current, enum_values: [...(current.enum_values ?? []), ''] }))} className="rounded border border-slate-300 px-3 py-1 text-xs">+ Add value</button>
                        </div>
                    )}

                    {localForm.type === 'VARCHAR' && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Length</label>
                            <input type="number" min="1" value={localForm.length ?? ''} onChange={(event) => setField('length', event.target.value ? Number(event.target.value) : null)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                        </div>
                    )}

                    {localForm.type === 'DECIMAL' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Precision</label>
                                <input type="number" min="1" value={localForm.precision ?? ''} onChange={(event) => setField('precision', event.target.value ? Number(event.target.value) : null)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Scale</label>
                                <input type="number" min="0" value={localForm.scale ?? ''} onChange={(event) => setField('scale', event.target.value ? Number(event.target.value) : null)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Default (optional)</label>
                        <input value={localForm.default} onChange={(event) => setField('default', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Collation (optional)</label>
                        <input value={localForm.collation} onChange={(event) => setField('collation', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Index</label>
                        <select value={localForm.index_type} onChange={(event) => setField('index_type', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                            <option value="">None</option>
                            <option value="primary">Primary</option>
                            <option value="unique">Unique</option>
                            <option value="index">Index</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(localForm.nullable)} onChange={(event) => setField('nullable', event.target.checked)} />Nullable</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(localForm.primary)} onChange={(event) => setField('primary', event.target.checked)} />Primary key</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(localForm.unique)} onChange={(event) => setField('unique', event.target.checked)} />Unique</label>
                        {isNumericType && <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(localForm.unsigned)} onChange={(event) => setField('unsigned', event.target.checked)} />Unsigned</label>}
                        {isNumericType && <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(localForm.auto_increment)} onChange={(event) => setField('auto_increment', event.target.checked)} />Auto increment</label>}
                    </div>

                    {(errors?.name?.[0] || errors?.general?.[0]) && <p className="text-sm text-red-600">{errors?.name?.[0] ?? errors?.general?.[0]}</p>}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
                        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">{mode === 'edit' ? 'Save field' : 'Add field'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
