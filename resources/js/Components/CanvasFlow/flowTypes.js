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

export const flowTools = ['select', 'rect', 'diamond', 'circle', 'text', 'sticky', 'arrow', 'pan'];
