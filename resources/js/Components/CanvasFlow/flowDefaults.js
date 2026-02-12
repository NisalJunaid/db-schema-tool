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

export function createFlowNode(nodeType, position = { x: 120, y: 120 }, size = null) {
    const palette = flowPalette.indigo;
    const id = `flow-${crypto.randomUUID()}`;
    const style = size ? { width: Math.max(80, Math.round(size.width)), height: Math.max(60, Math.round(size.height)), transition: 'transform 0.15s ease' } : { transition: 'transform 0.15s ease' };

    if (nodeType === 'text') {
        return { id, type: 'flowText', position, style, data: { text: 'Text', fontSize: 'md', color: '#0f172a' } };
    }

    if (nodeType === 'sticky') {
        return { id, type: 'flowSticky', position, style, data: { text: 'Sticky note', fillColor: '#fef08a', borderColor: '#ca8a04', borderStyle: 'solid', lockPosition: false, tone: 'yellow' } };
    }

    if (nodeType === 'group') {
        return { id, type: 'flowGroup', position, data: { text: 'Group', fillColor: '#e2e8f0', borderColor: '#64748b', borderStyle: 'dashed', lockPosition: false }, style: size ?? { width: 320, height: 220, transition: 'transform 0.15s ease' } };
    }

    return {
        id,
        type: byType[nodeType] ?? 'flowShape',
        position,
        style,
        data: {
            text: 'Shape',
            shape: nodeType,
            fillColor: palette.fill,
            borderColor: palette.border,
            borderStyle: 'solid',
            textAlign: 'center',
            fontSize: 'md',
            lockPosition: false,
        },
    };
}
