const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function createMindRootNode(position = { x: 0, y: 0 }) {
    return {
        id: `mind-${crypto.randomUUID()}`,
        type: 'mindTopic',
        position,
        data: { text: 'Central Topic', parentId: null, branchColor: '#334155', collapsed: false },
    };
}

export function createMindChildNode(parent, siblings = 0) {
    const color = colors[siblings % colors.length];
    return {
        id: `mind-${crypto.randomUUID()}`,
        type: 'mindTopic',
        position: { x: parent.position.x + 240, y: parent.position.y + (siblings * 90) - 45 },
        data: { text: 'New idea', parentId: parent.id, branchColor: color, collapsed: false },
    };
}
