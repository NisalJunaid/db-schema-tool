export const COLUMN_TYPE_OPTIONS = [
    'INT',
    'BIGINT',
    'SMALLINT',
    'VARCHAR',
    'TEXT',
    'LONGTEXT',
    'BOOLEAN',
    'DATE',
    'DATETIME',
    'TIMESTAMP',
    'DECIMAL',
    'FLOAT',
    'UUID',
    'JSON',
    'ENUM',
    'MEDIUMTEXT',
    'TINYTEXT',
];

export const COLUMN_PRESETS = [
    { key: 'id', label: 'id', name: 'id', type: 'BIGINT', nullable: false, primary: true, unique: false },
    { key: 'uuid', label: 'uuid', name: 'uuid', type: 'UUID', nullable: false, primary: false, unique: true },
    {
        key: 'created_at',
        label: 'created_at',
        name: 'created_at',
        type: 'TIMESTAMP',
        nullable: false,
        primary: false,
        unique: false,
    },
    {
        key: 'updated_at',
        label: 'updated_at',
        name: 'updated_at',
        type: 'TIMESTAMP',
        nullable: false,
        primary: false,
        unique: false,
    },
    {
        key: 'deleted_at',
        label: 'deleted_at',
        name: 'deleted_at',
        type: 'TIMESTAMP',
        nullable: true,
        primary: false,
        unique: false,
    },
    {
        key: 'user_id',
        label: 'user_id',
        name: 'user_id',
        type: 'BIGINT',
        nullable: false,
        primary: false,
        unique: false,
    },
    {
        key: 'status',
        label: 'status',
        name: 'status',
        type: 'VARCHAR(50)',
        nullable: false,
        primary: false,
        unique: false,
        default: '',
    },
];

export const RELATIONSHIP_TYPE_OPTIONS = [
    { value: 'one_to_one', label: '1:1' },
    { value: 'one_to_many', label: '1:N' },
    { value: 'many_to_many', label: 'N:N' },
];

export const TABLE_COLOR_OPTIONS = [
    { value: 'slate', label: 'Slate', solid: '#64748b', tint: '#f1f5f9' },
    { value: 'gray', label: 'Gray', solid: '#6b7280', tint: '#f3f4f6' },
    { value: 'blue', label: 'Blue', solid: '#3b82f6', tint: '#dbeafe' },
    { value: 'indigo', label: 'Indigo', solid: '#6366f1', tint: '#e0e7ff' },
    { value: 'violet', label: 'Violet', solid: '#8b5cf6', tint: '#ede9fe' },
    { value: 'emerald', label: 'Emerald', solid: '#10b981', tint: '#d1fae5' },
    { value: 'teal', label: 'Teal', solid: '#14b8a6', tint: '#ccfbf1' },
    { value: 'amber', label: 'Amber', solid: '#f59e0b', tint: '#fef3c7' },
    { value: 'rose', label: 'Rose', solid: '#f43f5e', tint: '#ffe4e6' },
];


function normalizeHexColor(value) {
    if (typeof value !== 'string') return null;
    const color = value.trim();
    if (!color.startsWith('#')) return null;
    if (color.length === 4) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
    }
    if (color.length === 7) return color.toLowerCase();
    return null;
}

export function shadeHexColor(hex, percent = -10) {
    const normalized = normalizeHexColor(hex);
    if (!normalized) return '#64748b';
    const amt = Math.round(2.55 * percent);
    const num = parseInt(normalized.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));

    return `#${(0x1000000 + (r * 0x10000) + (g * 0x100) + b).toString(16).slice(1)}`;
}

export function getTableColorMeta(value) {
    const hexColor = normalizeHexColor(value);
    if (hexColor) {
        return { value: hexColor, label: hexColor, solid: hexColor, tint: `${hexColor}20` };
    }

    return TABLE_COLOR_OPTIONS.find((entry) => entry.value === value) ?? TABLE_COLOR_OPTIONS[0];
}


export function formatColumnType(column) {
    const baseType = String(column?.type ?? 'VARCHAR').toUpperCase();

    if (baseType === 'ENUM') {
        const values = Array.isArray(column?.enum_values) ? column.enum_values : [];
        const serialized = values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(',');
        return `ENUM(${serialized})`;
    }

    if (baseType === 'DECIMAL') {
        const precision = Number(column?.precision);
        const scale = Number(column?.scale);
        if (Number.isFinite(precision) && Number.isFinite(scale)) {
            return `DECIMAL(${precision},${scale})`;
        }
    }

    if (baseType === 'VARCHAR') {
        const length = Number(column?.length);
        if (Number.isFinite(length) && length > 0) {
            return `VARCHAR(${length})`;
        }
    }

    const withUnsigned = column?.unsigned && ['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT'].includes(baseType)
        ? `${baseType} UNSIGNED`
        : baseType;

    return withUnsigned;
}

export function relationshipLabel(type) {
    return RELATIONSHIP_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? '1:N';
}

export function asCollection(value, fallbackKey) {
    if (Array.isArray(value)) {
        return value;
    }

    if (Array.isArray(value?.data)) {
        return value.data;
    }

    if (Array.isArray(value?.[fallbackKey])) {
        return value[fallbackKey];
    }

    return [];
}

export function toColumnHandleId(columnId, direction) {
    return `col-${columnId}-${direction}`;
}

export function parseColumnIdFromHandle(handleId) {
    const matched = String(handleId ?? '').match(/^col-(\d+)-(in|out)$/);
    return matched ? Number(matched[1]) : null;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function computeTableDimensions(table) {
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    const headerHeight = 44;
    const rowHeight = 34;
    const minWidth = 260;
    const maxWidth = 420;
    const charWidth = 8;
    const baseWidth = 180;
    const longestNameLength = Math.max(
        String(table?.name ?? '').length,
        ...columns.map((column) => String(column?.name ?? '').length),
    );

    const width = clamp(baseWidth + longestNameLength * charWidth, minWidth, maxWidth);
    const height = headerHeight + rowHeight * Math.max(columns.length, 1);

    return { width, height };
}
