import FlowShapeNode from './FlowShapeNode';
import FlowTextNode from './FlowTextNode';
import FlowStickyNode from './FlowStickyNode';
import FlowGroupNode from './FlowGroupNode';
import InkNode from './InkNode';

export const flowNodeTypes = {
    flowShape: FlowShapeNode,
    flowText: FlowTextNode,
    flowSticky: FlowStickyNode,
    flowGroup: FlowGroupNode,
    inkNode: InkNode,
};

export const flowTools = ['select', 'pan', 'connector', 'rect', 'rounded', 'diamond', 'circle', 'text', 'sticky', 'pen', 'toggle-ink'];
