import { SHAPE_KEYS, SHAPE_REGISTRY } from '@/Components/CanvasFlow/shapeRegistry';
import { MarkerType } from 'reactflow';

const byType = {
    ...Object.fromEntries(SHAPE_KEYS.map((shapeKey) => [shapeKey, 'flowShape'])),
    text: 'flowText',
    sticky: 'flowSticky',
    group: 'flowGroup',
};

export const FLOW_EDGE_DEFAULTS = {
    type: 'bezier',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
    style: { stroke: '#64748b', strokeWidth: 2 },
};

export function createFlowNode(nodeType, position = { x: 120, y: 120 }, size = null, style = {}) {
    const id = `flow-${crypto.randomUUID()}`;
    const shapeType = nodeType === 'rectangle' ? 'rect' : nodeType;
    const shapeDefaults = SHAPE_REGISTRY[shapeType]?.defaultSize ?? { width: 160, height: 90 };

    const width = Math.max(80, Math.round(size?.width ?? (shapeType === 'text' ? 140 : shapeDefaults.width)));
    const height = Math.max(40, Math.round(size?.height ?? (shapeType === 'sticky' ? 110 : shapeDefaults.height)));

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
            label: SHAPE_REGISTRY[shapeType]?.label ?? 'Shape',
            text: SHAPE_REGISTRY[shapeType]?.label ?? 'Shape',
            shapeType,
            fill: style.fill ?? '#ffffff',
            stroke: style.stroke ?? '#475569',
            strokeWidth: style.strokeWidth ?? 2,
            strokeStyle: style.strokeStyle ?? 'solid',
            opacity: style.opacity ?? 1,
            shadow: style.shadow ?? false,
            textSize: style.textSize ?? 'md',
            textVAlign: style.textVAlign ?? 'middle',
            ...style,
        },
    };
}
