export const flowPalette = {
    slate: { fill: '#f8fafc', border: '#64748b' },
    indigo: { fill: '#eef2ff', border: '#4f46e5' },
    emerald: { fill: '#ecfdf5', border: '#059669' },
    amber: { fill: '#fffbeb', border: '#d97706' },
    rose: { fill: '#fff1f2', border: '#e11d48' },
};

const byType = {
    rectangle: 'flowShape',
    rounded: 'flowShape',
    diamond: 'flowShape',
    circle: 'flowShape',
    text: 'flowText',
    sticky: 'flowSticky',
    group: 'flowGroup',
};

export function createFlowNode(nodeType, position = { x: 120, y: 120 }) {
    const palette = flowPalette.indigo;
    const id = `flow-${crypto.randomUUID()}`;

    if (nodeType === 'text') {
        return { id, type: 'flowText', position, data: { text: 'Text', fontSize: 'md', color: '#0f172a' } };
    }

    if (nodeType === 'sticky') {
        return { id, type: 'flowSticky', position, data: { text: 'Sticky note', fillColor: '#fef08a', borderColor: '#ca8a04', borderStyle: 'solid', lockPosition: false } };
    }

    if (nodeType === 'group') {
        return { id, type: 'flowGroup', position, data: { text: 'Group', fillColor: '#e2e8f0', borderColor: '#64748b', borderStyle: 'dashed', lockPosition: false }, style: { width: 320, height: 220 } };
    }

    return {
        id,
        type: byType[nodeType] ?? 'flowShape',
        position,
        data: {
            text: 'Shape',
            shape: nodeType,
            fillColor: palette.fill,
            borderColor: palette.border,
            borderStyle: 'solid',
            fontSize: 'md',
            lockPosition: false,
        },
    };
}
