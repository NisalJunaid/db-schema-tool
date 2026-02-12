const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function createMindRootNode(position = { x: 0, y: 0 }, text = 'Central Topic') {
    return {
        id: `mind-${crypto.randomUUID()}`,
        type: 'mindTopic',
        position,
        style: { transition: 'transform 0.15s ease' },
        data: { text, parentId: null, branchColor: '#334155', collapsed: false },
    };
}

export function createMindChildNode(parent, siblings = 0, text = 'New idea') {
    const color = colors[siblings % colors.length];
    return {
        id: `mind-${crypto.randomUUID()}`,
        type: 'mindTopic',
        position: { x: parent.position.x + 240, y: parent.position.y + (siblings * 72) - Math.max(0, siblings - 1) * 12 },
        style: { transition: 'transform 0.15s ease' },
        data: { text, parentId: parent.id, branchColor: color, collapsed: false },
    };
}
