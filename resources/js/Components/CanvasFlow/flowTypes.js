import FlowShapeNode from './FlowShapeNode';
import FlowTextNode from './FlowTextNode';
import FlowStickyNode from './FlowStickyNode';
import FlowGroupNode from './FlowGroupNode';
import InkNode from './InkNode';
import { SHAPE_KEYS } from './shapeRegistry';

export const flowNodeTypes = {
    flowShape: FlowShapeNode,
    flowText: FlowTextNode,
    flowSticky: FlowStickyNode,
    flowGroup: FlowGroupNode,
    inkNode: InkNode,
};

export const flowTools = ['select', 'pan', 'connector', ...SHAPE_KEYS, 'text', 'sticky', 'pen', 'toggle-ink'];
