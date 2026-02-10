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
