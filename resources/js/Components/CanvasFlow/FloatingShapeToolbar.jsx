import { useMemo } from 'react';

const STROKE_WIDTH_OPTIONS = [1, 2, 3, 4, 6, 8];
const TOOLBAR_OFFSET = 10;
const TOP_MARGIN = 8;

export default function FloatingShapeToolbar({
    selectedNode,
    reactFlowInstance,
    onUpdateNode,
    onDuplicate,
    onDelete,
    onClose,
}) {
    const position = useMemo(() => {
        if (!selectedNode || !reactFlowInstance?.flowToScreenPosition || !reactFlowInstance?.getNode) return null;

        const latestNode = reactFlowInstance.getNode(selectedNode.id) ?? selectedNode;
        const nodeWidth = Number(latestNode?.measured?.width ?? latestNode?.width ?? latestNode?.style?.width ?? 0);
        const anchorPosition = latestNode?.positionAbsolute ?? latestNode?.position ?? selectedNode.position;

        if (!anchorPosition) return null;

        const topCenter = {
            x: anchorPosition.x + (nodeWidth / 2),
            y: anchorPosition.y,
        };
        const screenPos = reactFlowInstance.flowToScreenPosition(topCenter);

        return {
            left: screenPos.x,
            top: Math.max(screenPos.y - TOOLBAR_OFFSET, TOP_MARGIN),
        };
    }, [reactFlowInstance, selectedNode]);

    if (!selectedNode || !position) return null;

    const fill = selectedNode.data?.fill ?? '#ffffff';
    const stroke = selectedNode.data?.stroke ?? '#475569';
    const strokeWidth = selectedNode.data?.strokeWidth ?? 2;
    const strokeStyle = selectedNode.data?.strokeStyle ?? selectedNode.data?.borderStyle ?? 'solid';
    const opacity = selectedNode.data?.opacity ?? 1;
    const shadow = Boolean(selectedNode.data?.shadow);
    const textVAlign = selectedNode.data?.textVAlign ?? 'middle';

    return (
        <div
            className="pointer-events-auto absolute z-[60] flex -translate-x-1/2 -translate-y-full items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg"
            style={position}
        >
            <input type="color" title="Fill" value={fill} onChange={(event) => onUpdateNode?.({ fill: event.target.value })} className="h-8 w-8" />
            <input type="color" title="Stroke" value={stroke} onChange={(event) => onUpdateNode?.({ stroke: event.target.value })} className="h-8 w-8" />
            <select
                title="Stroke width"
                value={strokeWidth}
                onChange={(event) => onUpdateNode?.({ strokeWidth: Number(event.target.value) })}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
                {STROKE_WIDTH_OPTIONS.map((option) => <option key={option} value={option}>{option}px</option>)}
            </select>
            <button
                type="button"
                title="Border style"
                onClick={() => onUpdateNode?.({ strokeStyle: strokeStyle === 'solid' ? 'dashed' : 'solid' })}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
                {strokeStyle === 'solid' ? 'Solid' : 'Dashed'}
            </button>
            <input
                type="range"
                title="Opacity"
                min="0.1"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(event) => onUpdateNode?.({ opacity: Number(event.target.value) })}
            />
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    title="Align text top"
                    onClick={() => onUpdateNode?.({ textVAlign: 'top' })}
                    className={`rounded border px-2 py-1 text-xs ${textVAlign === 'top' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}
                >
                    Top
                </button>
                <button
                    type="button"
                    title="Align text middle"
                    onClick={() => onUpdateNode?.({ textVAlign: 'middle' })}
                    className={`rounded border px-2 py-1 text-xs ${textVAlign === 'middle' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}
                >
                    Mid
                </button>
                <button
                    type="button"
                    title="Align text bottom"
                    onClick={() => onUpdateNode?.({ textVAlign: 'bottom' })}
                    className={`rounded border px-2 py-1 text-xs ${textVAlign === 'bottom' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}
                >
                    Bot
                </button>
            </div>
            <button
                type="button"
                title="Shadow"
                onClick={() => onUpdateNode?.({ shadow: !shadow })}
                className={`rounded border px-2 py-1 text-xs ${shadow ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}
            >
                Shadow
            </button>
            <button type="button" title="Duplicate" onClick={onDuplicate} className="rounded border border-slate-300 px-2 py-1 text-xs">Duplicate</button>
            <button type="button" title="Delete" onClick={onDelete} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600">Delete</button>
            <button type="button" title="Close" onClick={onClose} className="rounded border border-slate-300 px-2 py-1 text-xs">Close</button>
        </div>
    );
}
