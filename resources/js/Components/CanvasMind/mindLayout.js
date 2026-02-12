export function collectDescendantIds(nodeId, nodes) {
    const children = nodes.filter((node) => node.data?.parentId === nodeId);
    return children.flatMap((child) => [child.id, ...collectDescendantIds(child.id, nodes)]);
}
