const byType = {
    rect: 'flowShape',
    roundRect: 'flowShape',
    diamond: 'flowShape',
    ellipse: 'flowShape',
    parallelogram: 'flowShape',
    cylinder: 'flowShape',
    text: 'flowText',
    sticky: 'flowSticky',
    group: 'flowGroup',
};

export function createFlowNode(nodeType, position = { x: 120, y: 120 }, size = null, style = {}) {
    const id = `flow-${crypto.randomUUID()}`;
    const shapeType = nodeType === 'rectangle' ? 'rect' : nodeType === 'rounded' ? 'roundRect' : nodeType === 'circle' ? 'ellipse' : nodeType;
    const width = Math.max(80, Math.round(size?.width ?? (shapeType === 'text' ? 140 : 160)));
    const height = Math.max(40, Math.round(size?.height ?? (shapeType === 'sticky' ? 110 : 90)));

    const shared = {
        id,
        type: byType[shapeType] ?? 'flowShape',
        position,
        style: { width, height },
    };

    if (shapeType === 'text') return { ...shared, data: { label: 'Text', text: 'Text', textSize: style.textSize ?? 'md', ...style } };
    if (shapeType === 'sticky') return { ...shared, data: { label: 'Sticky note', text: 'Sticky note', fill: style.fill ?? '#fef08a', stroke: style.stroke ?? '#ca8a04', ...style } };

    return {
        ...shared,
        data: {
            label: 'Shape',
            text: 'Shape',
            shapeType,
            fill: style.fill ?? '#ffffff',
            stroke: style.stroke ?? '#475569',
            borderStyle: style.borderStyle ?? 'solid',
            textSize: style.textSize ?? 'md',
            ...style,
        },
    };
}
