export const COLUMN_TYPE_OPTIONS = [
    'INT',
    'BIGINT',
    'SMALLINT',
    'VARCHAR(255)',
    'TEXT',
    'LONGTEXT',
    'BOOLEAN',
    'DATE',
    'DATETIME',
    'TIMESTAMP',
    'DECIMAL(10,2)',
    'FLOAT',
    'UUID',
    'JSON',
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

export function getTableColorMeta(value) {
    return TABLE_COLOR_OPTIONS.find((entry) => entry.value === value) ?? TABLE_COLOR_OPTIONS[0];
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
