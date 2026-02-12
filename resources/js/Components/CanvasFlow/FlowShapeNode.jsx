import { Handle, NodeResizer, Position } from 'reactflow';

const textSizeClassMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
};

const textVAlignClassMap = {
    top: 'items-start',
    middle: 'items-center',
    bottom: 'items-end',
};

const HANDLE_POINTS = [
    { id: 'target-top', type: 'target', side: Position.Top, style: { left: '50%', transform: 'translateX(-50%)' } },
    { id: 'source-right', type: 'source', side: Position.Right, style: { top: '50%', transform: 'translateY(-50%)' } },
    { id: 'source-bottom', type: 'source', side: Position.Bottom, style: { left: '50%', transform: 'translateX(-50%)' } },
    { id: 'target-left', type: 'target', side: Position.Left, style: { top: '50%', transform: 'translateY(-50%)' } },
];

const toStrokeDashArray = (strokeStyle) => {
    if (strokeStyle === 'dotted') return '2 6';
    if (strokeStyle === 'dashed') return '10 8';
    return 'none';
};

const starPoints = '50,4 61,36 95,36 67,56 77,90 50,70 23,90 33,56 5,36 39,36';
const hexagonPoints = '25,6 75,6 96,50 75,94 25,94 4,50';
const pentagonPoints = '50,4 95,38 78,94 22,94 5,38';
const octagonPoints = '30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30';
const diamondPoints = '50,4 96,50 50,96 4,50';

function ShapeSvg({ shape, fill, stroke, strokeWidth, strokeStyle, opacity, shadowEnabled, shadowId }) {
    const dashArray = toStrokeDashArray(strokeStyle);
    const commonProps = {
        fill,
        stroke,
        strokeWidth,
        strokeDasharray: dashArray,
        vectorEffect: 'non-scaling-stroke',
    };

    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" style={{ opacity }}>
            {shadowEnabled && (
                <defs>
                    <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.18" />
                    </filter>
                </defs>
            )}
            <g filter={shadowEnabled ? `url(#${shadowId})` : undefined}>
                {shape === 'rounded' && <rect x="2" y="2" width="96" height="96" rx="18" ry="18" {...commonProps} />}
                {shape === 'circle' && <ellipse cx="50" cy="50" rx="47" ry="47" {...commonProps} />}
                {shape === 'diamond' && <polygon points={diamondPoints} {...commonProps} />}
                {shape === 'parallelogram' && <polygon points="20,4 98,4 80,96 2,96" {...commonProps} />}
                {shape === 'trapezoid' && <polygon points="18,4 82,4 98,96 2,96" {...commonProps} />}
                {shape === 'triangle' && <polygon points="50,4 96,96 4,96" {...commonProps} />}
                {shape === 'pentagon' && <polygon points={pentagonPoints} {...commonProps} />}
                {shape === 'octagon' && <polygon points={octagonPoints} {...commonProps} />}
                {shape === 'cylinder' && (
                    <>
                        <path d="M10 16 C10 9, 90 9, 90 16 L90 84 C90 91, 10 91, 10 84 Z" {...commonProps} />
                        <ellipse cx="50" cy="16" rx="40" ry="12" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray} vectorEffect="non-scaling-stroke" />
                        <path d="M10 84 C10 91, 90 91, 90 84" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray} vectorEffect="non-scaling-stroke" />
                    </>
                )}
                {shape === 'document' && (
                    <path d="M10 2 H70 L90 24 V98 H10 Z M70 2 V24 H90" {...commonProps} />
                )}
                {shape === 'cloud' && (
                    <path d="M24 78 H75 C88 78 95 68 95 58 C95 48 88 40 78 40 C77 27 67 18 54 18 C43 18 33 25 30 35 C18 34 8 44 8 56 C8 68 15 78 24 78 Z" {...commonProps} />
                )}
                {shape === 'star' && <polygon points={starPoints} {...commonProps} />}
                {shape === 'hexagon' && <polygon points={hexagonPoints} {...commonProps} />}
                {!['rounded', 'circle', 'diamond', 'parallelogram', 'trapezoid', 'triangle', 'pentagon', 'octagon', 'cylinder', 'document', 'cloud', 'star', 'hexagon'].includes(shape) && (
                    <rect x="2" y="2" width="96" height="96" {...commonProps} />
                )}
            </g>
        </svg>
    );
}

export default function FlowShapeNode({ id, data, selected }) {
    const shape = data?.shapeType ?? data?.shape ?? 'rect';
    const showAllHandles = Boolean(data?.showHandlesAll);
    const showHoverHandles = Boolean(data?.showHoverHandles);
    const showHandles = selected || showHoverHandles || showAllHandles;
    const isConnectable = Boolean(data?.connectable);
    const handleOpacity = selected ? 1 : (showHoverHandles ? 0.3 : (showAllHandles ? 0.9 : 0));
    const handleStyle = {
        width: 10,
        height: 10,
        border: '2px solid #475569',
        backgroundColor: '#ffffff',
        opacity: handleOpacity,
        pointerEvents: showHandles ? 'auto' : 'none',
        transition: 'opacity 120ms ease',
    };

    const updateLabel = (nextLabel) => {
        const trimmed = (nextLabel ?? '').trim();
        data?.onLabelChange?.(id, trimmed || 'Shape');
    };

    return (
        <>
            <NodeResizer
                isVisible={selected && data?.editMode}
                minWidth={60}
                minHeight={40}
                onResizeEnd={() => data?.onResizeEnd?.()}
            />
            {showHandles && HANDLE_POINTS.map((handle) => (
                <Handle
                    key={handle.id}
                    id={handle.id}
                    type={handle.type}
                    position={handle.side}
                    isConnectable={isConnectable}
                    style={{ ...handle.style, ...handleStyle }}
                />
            ))}
            <div className={`relative h-full w-full ${selected ? 'ring-2 ring-indigo-300' : ''}`}>
                <ShapeSvg
                    shape={shape}
                    fill={data?.fill ?? '#ffffff'}
                    stroke={data?.stroke ?? '#475569'}
                    strokeWidth={data?.strokeWidth ?? 2}
                    strokeStyle={data?.strokeStyle ?? data?.borderStyle ?? 'solid'}
                    opacity={data?.opacity ?? 1}
                    shadowEnabled={Boolean(data?.shadow)}
                    shadowId={`shape-shadow-${id}`}
                />
                <div
                    contentEditable={data?.editMode}
                    suppressContentEditableWarning
                    onBlur={(event) => updateLabel(event.target.innerText)}
                    className={`nodrag nopan absolute inset-0 flex justify-center px-3 text-center text-slate-700 outline-none ${textVAlignClassMap[data?.textVAlign ?? 'middle'] ?? 'items-center'} ${textSizeClassMap[data?.textSize ?? data?.fontSize ?? 'md'] ?? 'text-sm'}`}
                >
                    {data?.label ?? data?.text ?? 'Shape'}
                </div>
            </div>
        </>
    );
}
