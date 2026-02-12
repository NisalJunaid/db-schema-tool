import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toBlob, toPng } from 'html-to-image';
import { Background, ControlButton, Controls, MiniMap, ReactFlow, ReactFlowProvider, addEdge, applyEdgeChanges, applyNodeChanges, getRectOfNodes, getViewportForBounds, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import TableNode from '@/Components/Diagram/TableNode';
import Sidebar from '@/Components/Diagram/Sidebar';
import Toolbar from '@/Components/Diagram/Toolbar';
import AddColumnModal from '@/Components/Diagram/modals/AddColumnModal';
import AddTableModal from '@/Components/Diagram/modals/AddTableModal';
import ImportModal from '@/Components/Diagram/modals/ImportModal';
import ExportModal from '@/Components/Diagram/modals/ExportModal';
import NewDiagramModal from '@/Components/Diagram/modals/NewDiagramModal';
import OpenDiagramModal from '@/Components/Diagram/modals/OpenDiagramModal';
import RelationshipModal from '@/Components/Diagram/modals/RelationshipModal';
import ShareAccessModal from '@/Components/Diagrams/ShareAccessModal';
import EditorErrorBoundary from '@/Components/EditorErrorBoundary';
import FlowSidebar from '@/Components/CanvasFlow/FlowSidebar';
import { flowNodeTypes } from '@/Components/CanvasFlow/flowTypes';
import { createFlowNode } from '@/Components/CanvasFlow/flowDefaults';
import MindSidebar from '@/Components/CanvasMind/MindSidebar';
import FloatingToolbox from '@/Components/CanvasUI/FloatingToolbox';
import SelectionInspector from '@/Components/CanvasUI/SelectionInspector';
import DoodleLayer from '@/Components/CanvasShared/DoodleLayer';
import { mindNodeTypes } from '@/Components/CanvasMind/mindTypes';
import { collectDescendantIds } from '@/Components/CanvasMind/mindLayout';
import { createMindChildNode, createMindRootNode } from '@/Components/CanvasMind/mindDefaults';
import { asCollection, computeTableDimensions, getTableColorMeta, parseColumnIdFromHandle, relationshipLabel, toColumnHandleId } from '@/Components/Diagram/utils';
import { api, SESSION_EXPIRED_MESSAGE } from '@/lib/api';

const defaultTableSize = { w: 320, h: 240 };
const defaultColumnForm = { tableId: '', preset: '', name: '', type: 'VARCHAR(255)', nullable: false, primary: false, unique: false, default: '' };
const diagramColorPalette = ['#6366f1', '#0ea5e9', '#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e'];
const IMAGE_EXPORT_SECURITY_MESSAGE = "Image export blocked by browser security (cross-origin assets). If you're using CDN fonts/icons, bundle them locally.";
const isImageSecurityError = (error) => error?.name === 'SecurityError' || /tainted canvases|cross-origin/i.test(error?.message ?? '');
const EXCLUDED_CAPTURE_CLASSES = new Set(['react-flow__controls', 'react-flow__minimap']);

const FLOW_DRAW_TOOLS = ['rect', 'rounded', 'diamond', 'circle', 'text', 'sticky'];
const TOOL_COMPATIBILITY_MAP = { hand: 'pan', arrow: 'connector' };
const FLOW_RESIZE_COMMIT_DELAY = 250;

const normalizeTable = (rawTable) => ({ ...rawTable, columns: asCollection(rawTable.columns ?? rawTable.diagram_columns, 'diagram_columns') });
const cloneState = (value) => JSON.parse(JSON.stringify(value));

const pickNextColor = (usedColors) => {
    const normalizedUsed = new Set((usedColors ?? []).map((color) => String(color).toLowerCase()));
    const available = diagramColorPalette.find((color) => !normalizedUsed.has(color.toLowerCase()));
    if (available) return available;
    return diagramColorPalette[(usedColors?.length ?? 0) % diagramColorPalette.length];
};

const withAssignedRelationshipColors = (sourceRelationships) => {
    const used = [];
    return sourceRelationships.map((relationship) => {
        if (relationship.color) {
            used.push(relationship.color);
            return relationship;
        }
        const color = pickNextColor(used);
        used.push(color);
        return { ...relationship, color };
    });
};

function DiagramEditorContent() {
    const { diagramId, permissions: pagePermissions = {}, diagram: initialDiagramPayload = null, auth = {} } = usePage().props;
    const authUser = auth?.user ?? null;
    const reactFlowRef = useRef(null);
    const viewportSaveTimerRef = useRef(null);
    const editModeNoticeTimerRef = useRef(null);
    const previewUploadTimerRef = useRef(null);
    const canvasSaveTimerRef = useRef(null);

    const [diagram, setDiagram] = useState(null);
    const [tables, setTables] = useState([]);
    const [relationships, setRelationships] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [editorMode, setEditorMode] = useState(
        initialDiagramPayload?.editor_mode && ['db', 'flow', 'mind'].includes(initialDiagramPayload.editor_mode)
            ? initialDiagramPayload.editor_mode
            : 'db',
    );
    const [flowNodes, setFlowNodes] = useState(
        Array.isArray(initialDiagramPayload?.flow_state?.nodes)
            ? initialDiagramPayload.flow_state.nodes
            : [],
    );
    const [flowEdges, setFlowEdges] = useState(
        Array.isArray(initialDiagramPayload?.flow_state?.edges)
            ? initialDiagramPayload.flow_state.edges
            : [],
    );
    const [mindNodes, setMindNodes] = useState(
        Array.isArray(initialDiagramPayload?.mind_state?.nodes)
            ? initialDiagramPayload.mind_state.nodes
            : [],
    );
    const [mindEdges, setMindEdges] = useState(
        Array.isArray(initialDiagramPayload?.mind_state?.edges)
            ? initialDiagramPayload.mind_state.edges
            : [],
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingState, setSavingState] = useState('Autosaved');
    const [editMode, setEditMode] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeEditTableId, setActiveEditTableId] = useState(null);
    const [selectedColumnId, setSelectedColumnId] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState(null);
    const [showMiniMap, setShowMiniMap] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [activeTool, setActiveTool] = useState('select');
    const [toolStyle, setToolStyle] = useState({ fill: '#ffffff', stroke: '#475569', borderStyle: 'solid', textSize: 'md' });
    const [showInk, setShowInk] = useState(true);
    const [isDrawingShape, setIsDrawingShape] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const drawingRef = useRef({ start: null, nodeId: null, type: null });
    const [selectedDoodleId, setSelectedDoodleId] = useState(null);
    const [flowDoodles, setFlowDoodles] = useState(Array.isArray(initialDiagramPayload?.flow_state?.doodles) ? initialDiagramPayload.flow_state.doodles : []);
    const [mindDoodles, setMindDoodles] = useState(Array.isArray(initialDiagramPayload?.mind_state?.doodles) ? initialDiagramPayload.mind_state.doodles : []);
    const [activeStroke, setActiveStroke] = useState(null);
    const [editModeNotice, setEditModeNotice] = useState('');
    const [history, setHistory] = useState({ past: [], present: null, future: [] });
    const [flowHistory, setFlowHistory] = useState({ past: [], present: null, future: [] });
    const [mindHistory, setMindHistory] = useState({ past: [], present: null, future: [] });
    const flowMutationCommitTimerRef = useRef(null);
    const flowMutationBaseRef = useRef({ nodes: null, edges: null });
    const latestFlowStateRef = useRef({ nodes: flowNodes, edges: flowEdges });

    const [showAddTableModal, setShowAddTableModal] = useState(false);
    const [addTableForm, setAddTableForm] = useState({ name: '', schema: '' });
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [columnModalMode, setColumnModalMode] = useState('create');
    const [editingColumn, setEditingColumn] = useState(null);
    const [addColumnForm, setAddColumnForm] = useState(defaultColumnForm);
    const [relationshipDraft, setRelationshipDraft] = useState(null);
    const [relationshipModalState, setRelationshipModalState] = useState({ open: false, mode: 'create', type: 'one_to_many' });
    const [formErrors, setFormErrors] = useState({});

    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [allDiagrams, setAllDiagrams] = useState([]);
    const [teams, setTeams] = useState([]);
    const [showShareModal, setShowShareModal] = useState(false);

    const activeHistory = editorMode === 'db' ? history : editorMode === 'flow' ? flowHistory : mindHistory;
    const canUndo = activeHistory.past.length > 0;
    const canRedo = activeHistory.future.length > 0;

    useEffect(() => {
        latestFlowStateRef.current = { nodes: flowNodes, edges: flowEdges };
    }, [flowEdges, flowNodes]);

    useEffect(() => {
        if (!TOOL_COMPATIBILITY_MAP[activeTool]) return;
        setActiveTool(TOOL_COMPATIBILITY_MAP[activeTool]);
    }, [activeTool]);

    const permissions = diagram?.permissions ?? pagePermissions ?? {};
    const canView = Boolean(permissions.canView ?? true);
    const canEdit = Boolean(permissions.canEdit);
    const canManageAccess = Boolean(permissions.canManageAccess);
    const showSignInCta = error.includes(SESSION_EXPIRED_MESSAGE);


    const columnToTableMap = useMemo(() => {
        const map = {};
        tables.forEach((table) => (table.columns ?? []).forEach((column) => {
            map[column.id] = table.id;
        }));
        return map;
    }, [tables]);

    const buildDbSnapshot = useCallback((sourceTables, sourceRelationships) => ({
        tables: cloneState(sourceTables),
        relationships: cloneState(sourceRelationships),
    }), []);

    const safeClone = useCallback((value) => {
        try {
            return cloneState(value);
        } catch {
            return Array.isArray(value) ? [...value] : (value && typeof value === 'object' ? { ...value } : value);
        }
    }, []);

    const buildCanvasSnapshot = useCallback((sourceNodes, sourceEdges) => ({
        nodes: safeClone(Array.isArray(sourceNodes) ? sourceNodes : []),
        edges: safeClone(Array.isArray(sourceEdges) ? sourceEdges : []),
    }), [safeClone]);

    const commitEditorState = useCallback((nextTables, nextRelationships, previousTables = tables, previousRelationships = relationships) => {
        setHistory((current) => ({
            past: [...current.past, buildDbSnapshot(previousTables, previousRelationships)],
            present: buildDbSnapshot(nextTables, nextRelationships),
            future: [],
        }));
        setTables(nextTables);
        setRelationships(nextRelationships);
    }, [buildDbSnapshot, relationships, tables]);

    const undoHistory = useCallback(() => {
        if (editorMode === 'db') {
            setHistory((current) => {
                if (!current.past.length) return current;
                const previous = current.past[current.past.length - 1];
                const futureHead = current.present ? [buildDbSnapshot(current.present.tables, current.present.relationships)] : [];
                setTables(cloneState(previous.tables));
                setRelationships(cloneState(previous.relationships));
                setSelectedEdgeId(null);
                return {
                    past: current.past.slice(0, -1),
                    present: buildDbSnapshot(previous.tables, previous.relationships),
                    future: [...futureHead, ...current.future],
                };
            });
            return;
        }

        if (editorMode === 'flow') {
            setFlowHistory((current) => {
                if (!current.past.length) return current;
                const previous = current.past[current.past.length - 1];
                const futureHead = current.present ? [buildCanvasSnapshot(current.present.nodes, current.present.edges)] : [];
                setFlowNodes(cloneState(previous.nodes));
                setFlowEdges(cloneState(previous.edges));
                return {
                    past: current.past.slice(0, -1),
                    present: buildCanvasSnapshot(previous.nodes, previous.edges),
                    future: [...futureHead, ...current.future],
                };
            });
            return;
        }

        setMindHistory((current) => {
            if (!current.past.length) return current;
            const previous = current.past[current.past.length - 1];
            const futureHead = current.present ? [buildCanvasSnapshot(current.present.nodes, current.present.edges)] : [];
            setMindNodes(cloneState(previous.nodes));
            setMindEdges(cloneState(previous.edges));
            return {
                past: current.past.slice(0, -1),
                present: buildCanvasSnapshot(previous.nodes, previous.edges),
                future: [...futureHead, ...current.future],
            };
        });
    }, [buildCanvasSnapshot, buildDbSnapshot, editorMode]);

    const redoHistory = useCallback(() => {
        if (editorMode === 'db') {
            setHistory((current) => {
                if (!current.future.length) return current;
                const [next, ...remainingFuture] = current.future;
                const nextPast = current.present ? [...current.past, buildDbSnapshot(current.present.tables, current.present.relationships)] : current.past;
                setTables(cloneState(next.tables));
                setRelationships(cloneState(next.relationships));
                setSelectedEdgeId(null);
                return {
                    past: nextPast,
                    present: buildDbSnapshot(next.tables, next.relationships),
                    future: remainingFuture,
                };
            });
            return;
        }

        if (editorMode === 'flow') {
            setFlowHistory((current) => {
                if (!current.future.length) return current;
                const [next, ...remainingFuture] = current.future;
                const nextPast = current.present ? [...current.past, buildCanvasSnapshot(current.present.nodes, current.present.edges)] : current.past;
                setFlowNodes(cloneState(next.nodes));
                setFlowEdges(cloneState(next.edges));
                return {
                    past: nextPast,
                    present: buildCanvasSnapshot(next.nodes, next.edges),
                    future: remainingFuture,
                };
            });
            return;
        }

        setMindHistory((current) => {
            if (!current.future.length) return current;
            const [next, ...remainingFuture] = current.future;
            const nextPast = current.present ? [...current.past, buildCanvasSnapshot(current.present.nodes, current.present.edges)] : current.past;
            setMindNodes(cloneState(next.nodes));
            setMindEdges(cloneState(next.edges));
            return {
                past: nextPast,
                present: buildCanvasSnapshot(next.nodes, next.edges),
                future: remainingFuture,
            };
        });
    }, [buildCanvasSnapshot, buildDbSnapshot, editorMode]);

    const handle401 = useCallback((message) => setError(message ?? `${SESSION_EXPIRED_MESSAGE} to continue editing.`), []);

    const loadDiagram = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/api/v1/diagrams/${diagramId}`);
            const diagramPayload = response?.data ?? response;
            const loadedTables = asCollection(diagramPayload.diagram_tables ?? diagramPayload.diagramTables, 'diagram_tables').map(normalizeTable);
            const usedTableColors = [];
            const normalizedTables = loadedTables.map((table) => {
                if (table.color) {
                    usedTableColors.push(table.color);
                    return table;
                }
                const color = pickNextColor(usedTableColors);
                usedTableColors.push(color);
                return { ...table, color };
            });
            const relationshipRows = withAssignedRelationshipColors(asCollection(diagramPayload.diagram_relationships ?? diagramPayload.diagramRelationships, 'diagram_relationships').map((relationship) => ({
                ...relationship,
                sourceHandle: relationship.sourceHandle || toColumnHandleId(relationship.from_column_id, 'out'),
                targetHandle: relationship.targetHandle || toColumnHandleId(relationship.to_column_id, 'in'),
            })));
            const mode = diagramPayload?.editor_mode && ['db', 'flow', 'mind'].includes(diagramPayload.editor_mode)
                ? diagramPayload.editor_mode
                : 'db';
            const loadedFlowNodes = asCollection(diagramPayload?.flow_state?.nodes ?? [], 'nodes');
            const loadedFlowEdges = asCollection(diagramPayload?.flow_state?.edges ?? [], 'edges');
            const loadedMindNodes = asCollection(diagramPayload?.mind_state?.nodes ?? [], 'nodes');
            const loadedMindEdges = asCollection(diagramPayload?.mind_state?.edges ?? [], 'edges');

            setDiagram(diagramPayload);
            setEditorMode(mode);
            setTables(normalizedTables);
            setRelationships(relationshipRows);

            if (diagramPayload?.editor_mode === 'flow') {
                setFlowNodes(Array.isArray(diagramPayload.flow_state?.nodes) ? diagramPayload.flow_state.nodes : []);
                setFlowEdges(Array.isArray(diagramPayload.flow_state?.edges) ? diagramPayload.flow_state.edges : []);
                setFlowDoodles(Array.isArray(diagramPayload.flow_state?.doodles) ? diagramPayload.flow_state.doodles : []);
            } else {
                setFlowNodes(loadedFlowNodes);
                setFlowEdges(loadedFlowEdges);
                setFlowDoodles(Array.isArray(diagramPayload?.flow_state?.doodles) ? diagramPayload.flow_state.doodles : []);
            }

            if (diagramPayload?.editor_mode === 'mind') {
                setMindNodes(Array.isArray(diagramPayload.mind_state?.nodes) ? diagramPayload.mind_state.nodes : []);
                setMindEdges(Array.isArray(diagramPayload.mind_state?.edges) ? diagramPayload.mind_state.edges : []);
                setMindDoodles(Array.isArray(diagramPayload.mind_state?.doodles) ? diagramPayload.mind_state.doodles : []);
            } else {
                setMindNodes(loadedMindNodes);
                setMindEdges(loadedMindEdges);
                setMindDoodles(Array.isArray(diagramPayload?.mind_state?.doodles) ? diagramPayload.mind_state.doodles : []);
            }
            setHistory({ past: [], present: buildDbSnapshot(normalizedTables, relationshipRows), future: [] });
            setFlowHistory({ past: [], present: { nodes: cloneState(loadedFlowNodes), edges: cloneState(loadedFlowEdges) }, future: [] });
            setMindHistory({ past: [], present: { nodes: cloneState(loadedMindNodes), edges: cloneState(loadedMindEdges) }, future: [] });
        } catch (loadError) {
            if (loadError?.status === 401) return handle401();
            setError(loadError.message || 'Unable to load diagram.');
        } finally {
            setLoading(false);
        }
    }, [buildDbSnapshot, diagramId, handle401]);

    useEffect(() => {
        loadDiagram();
    }, [loadDiagram]);

    useEffect(() => {
        const loadMeta = async () => {
            const [diagramRows, teamRows] = await Promise.all([api.get('/api/v1/diagrams'), api.get('/api/v1/teams')]);
            setAllDiagrams(diagramRows?.data ?? diagramRows ?? []);
            setTeams(teamRows?.data ?? teamRows ?? []);
        };
        loadMeta().catch(() => {});
    }, []);

    useEffect(() => {
        if (!canEdit && editMode) {
            setEditMode(false);
        }
    }, [canEdit, editMode]);

    useEffect(() => {
        if (editorMode === 'db') return;
        setActiveTool('select');
    }, [editorMode]);


    useEffect(() => {
        if (editMode) return;
        drawingRef.current = { start: null, nodeId: null, type: null };
        setIsDrawingShape(false);
        setActiveTool('select');
    }, [editMode]);
    useEffect(() => () => {
        if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        if (editModeNoticeTimerRef.current) clearTimeout(editModeNoticeTimerRef.current);
        if (previewUploadTimerRef.current) clearTimeout(previewUploadTimerRef.current);
        if (canvasSaveTimerRef.current) clearTimeout(canvasSaveTimerRef.current);
    }, []);

    async function uploadDiagramPreview() {
        const instance = reactFlowRef.current;
        if (!instance) return;

        instance.fitView({ padding: 0.2 });

        await new Promise((resolve) => setTimeout(resolve, 300));

        const el = document.querySelector('.react-flow');
        if (!el) return;

        const blob = await toBlob(el, {
            backgroundColor: '#f8fafc',
            pixelRatio: 2,
            useCORS: true,
            cacheBust: true,
            filter: (node) => {
                if (!node.classList) return true;

                return !node.classList.contains('react-flow__controls')
                    && !node.classList.contains('react-flow__minimap')
                    && !node.classList.contains('editor-toolbar');
            },
        });

        if (!blob) return;

        const formData = new FormData();
        formData.append('preview', blob, 'preview.png');

        const response = await api.post(
            `/api/v1/diagrams/${diagramId}/preview`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );

        const payload = response?.data ?? response;

        setDiagram((prev) => ({
            ...prev,
            preview_url: payload.preview_url,
            preview_path: payload.preview_path,
        }));
    }

    const schedulePreviewUpload = useCallback(() => {
        if (previewUploadTimerRef.current) {
            clearTimeout(previewUploadTimerRef.current);
        }

        previewUploadTimerRef.current = setTimeout(() => {
            uploadDiagramPreview().catch(() => {});
        }, 500);
    }, [diagramId]);

    const scheduleCanvasSave = useCallback((mode, payload) => {
        if (!canEdit || mode === 'db') return;
        if (canvasSaveTimerRef.current) clearTimeout(canvasSaveTimerRef.current);
        canvasSaveTimerRef.current = setTimeout(async () => {
            try {
                const viewport = reactFlowRef.current?.getViewport?.() ?? diagram?.viewport ?? { x: 0, y: 0, zoom: 1 };
                setSavingState('Saving...');
                if (mode === 'flow') {
                    await api.patch(`/api/v1/diagrams/${diagramId}`, { editor_mode: mode, flow_state: payload, viewport });
                } else if (mode === 'mind') {
                    await api.patch(`/api/v1/diagrams/${diagramId}`, { editor_mode: mode, mind_state: payload, viewport });
                }
                setSavingState('Autosaved');
            } catch {
                setSavingState('Error');
            }
        }, 500);
    }, [canEdit, diagram?.viewport, diagramId]);

    const onRenameTable = useCallback(async (tableId, name) => {
        if (!canEdit || !editMode) return;
        const previousTables = tables;
        const nextTables = tables.map((entry) => (entry.id === tableId ? { ...entry, name } : entry));
        commitEditorState(nextTables, relationships, previousTables, relationships);
        try {
            setSavingState('Saving...');
            await api.patch(`/api/v1/diagram-tables/${tableId}`, { name });
            schedulePreviewUpload();
            setSavingState('Autosaved');
        } catch (renameError) {
            setTables(previousTables);
            setHistory((current) => ({ ...current, present: buildDbSnapshot(previousTables, relationships), past: current.past.slice(0, -1) }));
            setSavingState('Error');
            if (renameError?.status === 401) return handle401();
            setError(renameError.message || 'Failed to rename table.');
        }
    }, [buildDbSnapshot, canEdit, commitEditorState, editMode, handle401, relationships, schedulePreviewUpload, tables]);

    const onUpdateTableColor = useCallback(async (tableId, color) => {
        if (!canEdit || !editMode) return;
        const previousTables = tables;
        const nextTables = tables.map((table) => (table.id === tableId ? { ...table, color } : table));
        commitEditorState(nextTables, relationships, previousTables, relationships);
        try {
            setSavingState('Saving...');
            await api.patch(`/api/v1/diagram-tables/${tableId}`, { color });
            schedulePreviewUpload();
            setSavingState('Autosaved');
        } catch (updateError) {
            setTables(previousTables);
            setSavingState('Error');
            setError(updateError.message || 'Failed to update table color.');
        }
    }, [canEdit, commitEditorState, editMode, relationships, schedulePreviewUpload, tables]);

    const onAddColumn = useCallback((tableId) => { setFormErrors({}); setColumnModalMode('create'); setEditingColumn(null); setAddColumnForm({ ...defaultColumnForm, tableId: String(tableId) }); setShowAddColumnModal(true); }, []);
    const onEditColumn = useCallback((column) => { setFormErrors({}); setColumnModalMode('edit'); setEditingColumn(column); setAddColumnForm({ ...defaultColumnForm, tableId: String(column.diagram_table_id), name: column.name, type: column.type, nullable: Boolean(column.nullable), primary: Boolean(column.primary), unique: Boolean(column.unique), default: column.default ?? '' }); setShowAddColumnModal(true); }, []);

    const onDeleteColumn = useCallback(async (columnId) => {
        if (!canEdit || !editMode || !window.confirm('Delete this field?')) return;
        const previousTables = tables;
        const previousRelationships = relationships;
        const owningTable = tables.find((table) => (table.columns ?? []).some((column) => Number(column.id) === Number(columnId)));
        const nextTables = tables.map((table) => ({ ...table, columns: (table.columns ?? []).filter((column) => Number(column.id) !== Number(columnId)) }));
        const nextRelationships = relationships.filter((r) => Number(r.from_column_id) !== Number(columnId) && Number(r.to_column_id) !== Number(columnId));
        commitEditorState(nextTables, nextRelationships, previousTables, previousRelationships);
        if (owningTable?.id != null) {
            setNodes((nds) => nds.map((n) => (n.id === String(owningTable.id) ? { ...n } : n)));
        }
        try { setSavingState('Saving...'); await api.delete(`/api/v1/diagram-columns/${columnId}`); setSavingState('Autosaved'); }
        catch (deleteError) { setTables(previousTables); setSavingState('Error'); setError(deleteError.message || 'Failed to delete field.'); }
    }, [canEdit, commitEditorState, editMode, relationships, tables]);

    const onToggleActiveEditTable = useCallback((tableId) => setActiveEditTableId((current) => (Number(current) === Number(tableId) ? null : tableId)), []);
    const notifyEditModeRequired = useCallback(() => {
        setEditModeNotice('Enable Edit Mode to delete');
        window.clearTimeout(editModeNoticeTimerRef.current);
        editModeNoticeTimerRef.current = window.setTimeout(() => setEditModeNotice(''), 2200);
    }, []);
    const buildNodeData = useCallback((table) => ({ table, editMode, selectedColumnId, isActiveEditTable: Number(activeEditTableId) === Number(table.id), onToggleActiveEditTable, onRenameTable, onUpdateTableColor, onAddColumn, onEditColumn, onDeleteColumn }), [activeEditTableId, editMode, selectedColumnId, onToggleActiveEditTable, onRenameTable, onUpdateTableColor, onAddColumn, onEditColumn, onDeleteColumn]);

    useEffect(() => {
        setNodes(tables.map((table) => {
            if (table?.id == null) return null;
            const computedDimensions = computeTableDimensions(table);
            const rawWidth = Number(table?.w ?? computedDimensions.width ?? defaultTableSize.w);
            const width = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : defaultTableSize.w;
            const rawX = Number(table?.x ?? 0);
            const rawY = Number(table?.y ?? 0);
            return {
                id: String(table.id),
                type: 'tableNode',
                draggable: editMode,
                position: {
                    x: Number.isFinite(rawX) ? rawX : 0,
                    y: Number.isFinite(rawY) ? rawY : 0,
                },
                data: buildNodeData(table),
                style: { width },
                selected: selectedNodeId === String(table.id),
            };
        }).filter(Boolean));
    }, [tables, editMode, selectedColumnId, buildNodeData, selectedNodeId]);

    const edges = useMemo(() => relationships.map((relationship) => {
        const sourceTableId = columnToTableMap[relationship.from_column_id];
        const targetTableId = columnToTableMap[relationship.to_column_id];
        if (!sourceTableId || !targetTableId) return null;
        const isSelected = selectedEdgeId === String(relationship.id);
        return {
            id: String(relationship.id),
            source: String(sourceTableId),
            target: String(targetTableId),
            sourceHandle: relationship.sourceHandle || toColumnHandleId(relationship.from_column_id, 'out'),
            targetHandle: relationship.targetHandle || toColumnHandleId(relationship.to_column_id, 'in'),
            type: 'default',
            label: relationshipLabel(relationship.type),
            animated: false,
            data: { type: relationship.type },
            selected: isSelected,
            style: {
                strokeDasharray: '5 5',
                strokeWidth: isSelected ? 4 : 2,
                stroke: relationship.color || '#64748b',
                opacity: isSelected ? 1 : 0.9,
            },
            labelStyle: { fill: '#334155', fontSize: 11, fontWeight: 600 },
        };
    }).filter(Boolean), [relationships, selectedEdgeId, columnToTableMap]);

    const activeNodes = useMemo(() => {
        if (editorMode === 'db') return nodes;
        if (editorMode === 'flow') return flowNodes;

        const hiddenIds = new Set(mindNodes.filter((node) => node.data?.collapsed).flatMap((node) => collectDescendantIds(node.id, mindNodes)));
        return mindNodes.filter((node) => !hiddenIds.has(node.id));
    }, [editorMode, flowNodes, mindNodes, nodes]);

    const activeEdges = useMemo(() => {
        if (editorMode === 'db') return edges;
        if (editorMode === 'flow') return flowEdges;

        const hiddenIds = new Set(mindNodes.filter((node) => node.data?.collapsed).flatMap((node) => collectDescendantIds(node.id, mindNodes)));
        return mindEdges.filter((edge) => !hiddenIds.has(edge.source) && !hiddenIds.has(edge.target));
    }, [editorMode, edges, flowEdges, mindEdges, mindNodes]);

    const commitFlowState = useCallback((nextNodes, nextEdges, previousNodes = flowNodes, previousEdges = flowEdges) => {
        setFlowHistory((current) => ({
            past: [...current.past, buildCanvasSnapshot(previousNodes, previousEdges)],
            present: buildCanvasSnapshot(nextNodes, nextEdges),
            future: [],
        }));
        setFlowNodes(nextNodes);
        setFlowEdges(nextEdges);
    }, [buildCanvasSnapshot, flowEdges, flowNodes]);

    const commitMindState = useCallback((nextNodes, nextEdges, previousNodes = mindNodes, previousEdges = mindEdges) => {
        setMindHistory((current) => ({
            past: [...current.past, buildCanvasSnapshot(previousNodes, previousEdges)],
            present: buildCanvasSnapshot(nextNodes, nextEdges),
            future: [],
        }));
        setMindNodes(nextNodes);
        setMindEdges(nextEdges);
    }, [buildCanvasSnapshot, mindEdges, mindNodes]);


    const toFlowPoint = useCallback((clientX, clientY) => {
        const instance = reactFlowRef.current;
        if (!instance) return { x: 0, y: 0 };
        if (typeof instance.screenToFlowPosition === 'function') {
            return instance.screenToFlowPosition({ x: clientX, y: clientY });
        }
        if (typeof instance.project === 'function') {
            return instance.project({ x: clientX, y: clientY });
        }
        return { x: 0, y: 0 };
    }, []);

    const finalizeFlowDrawing = useCallback(() => {
        if (!isDrawingShape || !drawingRef.current?.nodeId) return;
        const nodeId = drawingRef.current.nodeId;
        const previousNodes = drawingRef.current.previousNodes ?? flowNodes;
        const nextNode = flowNodes.find((entry) => entry.id === nodeId);
        const width = Number(nextNode?.style?.width ?? 0);
        const height = Number(nextNode?.style?.height ?? 0);
        const isTiny = width < 10 || height < 10;
        const isCancelled = !nextNode || isTiny;

        if (isCancelled) {
            setFlowNodes((nodesState) => nodesState.filter((entry) => entry.id !== nodeId));
        } else {
            commitFlowState(flowNodes, flowEdges, previousNodes, flowEdges);
            scheduleCanvasSave('flow', { nodes: flowNodes, edges: flowEdges, doodles: flowDoodles });
            setSelectedNodeId(nodeId);
        }

        drawingRef.current = { start: null, nodeId: null, type: null, previousNodes: null };
        setIsDrawingShape(false);
    }, [commitFlowState, flowDoodles, flowEdges, flowNodes, isDrawingShape, scheduleCanvasSave]);

    const handlePaneMouseDown = useCallback((event) => {
        if (editorMode !== 'flow') return;

        if (activeTool === 'pan') {
            setIsPanning(true);
            return;
        }

        if (!(canEdit && editMode) || !reactFlowRef.current) return;
        if (!FLOW_DRAW_TOOLS.includes(activeTool)) return;
        if (!event.target?.closest?.('.react-flow__pane')) return;

        const start = toFlowPoint(event.clientX, event.clientY);
        const nextNode = createFlowNode(activeTool, start, { width: 60, height: 40 }, toolStyle);
        drawingRef.current = { start, nodeId: nextNode.id, type: activeTool, previousNodes: flowNodes };
        setIsDrawingShape(true);
        setFlowNodes((current) => [...current, nextNode]);
        setSelectedEdgeId(null);
        setSelectedDoodleId(null);
        event.preventDefault();
    }, [activeTool, canEdit, editMode, editorMode, flowNodes, toFlowPoint, toolStyle]);

    const handlePaneMouseMove = useCallback((event) => {
        if (activeTool === 'pan' && isPanning) {
            return;
        }
        if (!isDrawingShape || !drawingRef.current?.nodeId) return;
        const current = toFlowPoint(event.clientX, event.clientY);
        const start = drawingRef.current.start;
        const width = Math.max(60, Math.abs(current.x - start.x));
        const height = Math.max(40, Math.abs(current.y - start.y));
        const topLeft = { x: Math.min(start.x, current.x), y: Math.min(start.y, current.y) };

        setFlowNodes((nodesState) => nodesState.map((node) => (
            node.id === drawingRef.current.nodeId
                ? { ...node, position: topLeft, style: { ...(node.style ?? {}), width, height } }
                : node
        )));
    }, [activeTool, isDrawingShape, isPanning, toFlowPoint]);

    const handlePaneMouseUp = useCallback(() => {
        if (isPanning) setIsPanning(false);
        finalizeFlowDrawing();
    }, [finalizeFlowDrawing, isPanning]);

    const addMindSibling = useCallback(() => {
        if (!canEdit || !editMode || !selectedNodeId) return;
        const selected = mindNodes.find((node) => node.id === selectedNodeId);
        if (!selected?.data?.parentId) return;
        const parent = mindNodes.find((node) => node.id === selected.data.parentId);
        if (!parent) return;
        const siblingsCount = mindNodes.filter((node) => node.data?.parentId === parent.id).length;
        const sibling = createMindChildNode(parent, siblingsCount);
        commitMindState([...mindNodes, sibling], [...mindEdges, { id: `edge-${crypto.randomUUID()}`, source: parent.id, target: sibling.id, type: 'bezier', style: { stroke: parent.data?.branchColor ?? '#94a3b8', strokeWidth: 2 } }]);
        setSelectedNodeId(sibling.id);
    }, [canEdit, commitMindState, editMode, mindEdges, mindNodes, selectedNodeId]);

    const addMindFloatingTopic = useCallback((position = { x: 120, y: 120 }) => {
        if (!canEdit || !editMode) return;
        const topic = createMindRootNode(position, 'Floating topic');
        commitMindState([...mindNodes, topic], mindEdges);
        setSelectedNodeId(topic.id);
    }, [canEdit, commitMindState, editMode, mindEdges, mindNodes]);

    const onNodesChange = useCallback((changes) => {
        if (editorMode === 'db') {
            setNodes((current) => applyNodeChanges(changes, current));
            return;
        }

        if (editorMode === 'flow') {
            const hasFlowMutation = changes.some((change) => ['position', 'dimensions', 'remove', 'add', 'replace'].includes(change.type));
            if (hasFlowMutation && !flowMutationBaseRef.current.nodes) {
                flowMutationBaseRef.current = { nodes: latestFlowStateRef.current.nodes, edges: latestFlowStateRef.current.edges };
            }

            setFlowNodes((current) => applyNodeChanges(changes, current));

            if (hasFlowMutation) {
                if (flowMutationCommitTimerRef.current) clearTimeout(flowMutationCommitTimerRef.current);
                flowMutationCommitTimerRef.current = setTimeout(() => {
                    const previous = flowMutationBaseRef.current;
                    const nextState = latestFlowStateRef.current;
                    commitFlowState(nextState.nodes, nextState.edges, previous.nodes ?? nextState.nodes, previous.edges ?? nextState.edges);
                    scheduleCanvasSave('flow', { nodes: nextState.nodes, edges: nextState.edges, doodles: flowDoodles });
                    flowMutationBaseRef.current = { nodes: null, edges: null };
                }, FLOW_RESIZE_COMMIT_DELAY);
            }
            return;
        }

        setMindNodes((current) => applyNodeChanges(changes, current));
    }, [commitFlowState, editorMode, flowDoodles, scheduleCanvasSave]);

    const onEdgesChange = useCallback((changes) => {
        if (editorMode === 'flow') {
            setFlowEdges((current) => applyEdgeChanges(changes, current));
            return;
        }
        if (editorMode === 'mind') {
            setMindEdges((current) => applyEdgeChanges(changes, current));
        }
    }, [editorMode]);

    const onConnect = useCallback((connection) => {
        if (!canEdit || !editMode) return;

        if (editorMode !== 'db' && activeTool !== 'connector') return;

        if (editorMode === 'db') {
            const sourceColumnId = parseColumnIdFromHandle(connection.sourceHandle);
            const targetColumnId = parseColumnIdFromHandle(connection.targetHandle);
            if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) return;
            const isDuplicate = relationships.some((entry) => Number(entry.from_column_id) === sourceColumnId && Number(entry.to_column_id) === targetColumnId);
            if (isDuplicate) return;
            setRelationshipDraft({ sourceHandle: connection.sourceHandle, targetHandle: connection.targetHandle, from_column_id: sourceColumnId, to_column_id: targetColumnId });
            setRelationshipModalState({ open: true, mode: 'create', type: 'one_to_many' });
            return;
        }

        const nextEdge = {
            id: `edge-${crypto.randomUUID()}`,
            type: 'bezier',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
            style: { stroke: '#64748b', strokeWidth: 2 },
            ...connection,
            label: '',
        };

        if (editorMode === 'flow') {
            const nextEdges = addEdge(nextEdge, flowEdges);
            commitFlowState(flowNodes, nextEdges);
            scheduleCanvasSave('flow', { nodes: flowNodes, edges: nextEdges, doodles: flowDoodles });
        }

        if (editorMode === 'mind') {
            const nextEdges = addEdge({ ...nextEdge, style: { stroke: '#94a3b8', strokeWidth: 1.8 } }, mindEdges);
            commitMindState(mindNodes, nextEdges);
            scheduleCanvasSave('mind', { nodes: mindNodes, edges: nextEdges, doodles: mindDoodles });
        }
    }, [activeTool, canEdit, commitFlowState, commitMindState, editMode, editorMode, flowDoodles, flowEdges, flowNodes, mindDoodles, mindEdges, mindNodes, relationships, scheduleCanvasSave]);

    const onNodeClick = useCallback((event, node) => {
        setSelectedDoodleId(null);
        if (!(canEdit && editMode) || editorMode !== 'mind') {
            setSelectedNodeId(String(node.id));
            setSelectedEdgeId(null);
            return;
        }

        if (activeTool === 'child') {
            const siblings = mindNodes.filter((entry) => entry.data?.parentId === node.id).length;
            const child = createMindChildNode(node, siblings);
            const expandedNodes = mindNodes.map((entry) => (entry.id === node.id ? { ...entry, data: { ...entry.data, collapsed: false } } : entry));
            const nextNodes = [...expandedNodes, child];
            const nextEdges = [...mindEdges, { id: `edge-${crypto.randomUUID()}`, source: node.id, target: child.id, type: 'bezier', style: { stroke: node.data?.branchColor ?? '#94a3b8', strokeWidth: 2 } }];
            commitMindState(nextNodes, nextEdges);
            scheduleCanvasSave('mind', { nodes: nextNodes, edges: nextEdges, doodles: mindDoodles });
            setSelectedNodeId(child.id);
            setActiveTool('select');
            event.stopPropagation();
            return;
        }

        if (activeTool === 'sibling' && node.data?.parentId) {
            const parent = mindNodes.find((entry) => entry.id === node.data.parentId);
            if (parent) {
                const siblings = mindNodes.filter((entry) => entry.data?.parentId === parent.id).length;
                const sibling = createMindChildNode(parent, siblings);
                const nextNodes = [...mindNodes, sibling];
                const nextEdges = [...mindEdges, { id: `edge-${crypto.randomUUID()}`, source: parent.id, target: sibling.id, type: 'bezier', style: { stroke: parent.data?.branchColor ?? '#94a3b8', strokeWidth: 2 } }];
                commitMindState(nextNodes, nextEdges);
                scheduleCanvasSave('mind', { nodes: nextNodes, edges: nextEdges, doodles: mindDoodles });
                setSelectedNodeId(sibling.id);
                setActiveTool('select');
                event.stopPropagation();
                return;
            }
        }

        setSelectedNodeId(String(node.id));
        setSelectedEdgeId(null);
    }, [canEdit, activeTool, commitMindState, editMode, editorMode, mindDoodles, mindEdges, mindNodes, scheduleCanvasSave]);

    const onEdgeClick = useCallback((_, edge) => {
        setSelectedEdgeId(String(edge.id));
        setSelectedNodeId(null);
        setSelectedDoodleId(null);
    }, []);

    const onEdgeDoubleClick = useCallback((_, edge) => {
        if (!canEdit || !editMode) return;

        if (editorMode === 'flow') {
            const label = window.prompt('Edge label', edge.label ?? '');
            if (label == null) return;
            const nextEdges = flowEdges.map((entry) => (entry.id === edge.id ? { ...entry, label } : entry));
            commitFlowState(flowNodes, nextEdges);
            setSelectedEdgeId(edge.id);
            return;
        }

        if (editorMode === 'mind') {
            return;
        }

        const relationship = relationships.find((entry) => String(entry.id) === String(edge.id));
        if (!relationship) return;
        setRelationshipDraft(relationship);
        setRelationshipModalState({ open: true, mode: 'edit', type: relationship.type ?? 'one_to_many' });
    }, [canEdit, commitFlowState, editMode, editorMode, flowEdges, flowNodes, relationships]);

    const deleteSelectedRelationship = useCallback(async () => {
        if (!selectedEdgeId) return;
        if (!canEdit || !editMode) {
            notifyEditModeRequired();
            return;
        }

        if (editorMode === 'db') {
            const previousRelationships = relationships;
            const nextRelationships = relationships.filter((relationship) => String(relationship.id) !== String(selectedEdgeId));
            commitEditorState(tables, nextRelationships, tables, previousRelationships);
            setSelectedEdgeId(null);
            try {
                setSavingState('Saving...');
                await api.delete(`/api/v1/diagram-relationships/${selectedEdgeId}`);
                schedulePreviewUpload();
                setSavingState('Autosaved');
            } catch (deleteError) {
                setRelationships(previousRelationships);
                setSavingState('Error');
                setError(deleteError.message || 'Failed to delete relationship.');
            }
            return;
        }

        if (editorMode === 'flow') {
            const nextEdges = flowEdges.filter((edge) => edge.id !== selectedEdgeId);
            commitFlowState(flowNodes, nextEdges);
            scheduleCanvasSave('flow', { nodes: flowNodes, edges: nextEdges, doodles: flowDoodles });
        }

        if (editorMode === 'mind') {
            const nextEdges = mindEdges.filter((edge) => edge.id !== selectedEdgeId);
            commitMindState(mindNodes, nextEdges);
            scheduleCanvasSave('mind', { nodes: mindNodes, edges: nextEdges, doodles: mindDoodles });
        }

        setSelectedEdgeId(null);
    }, [canEdit, commitEditorState, commitFlowState, commitMindState, editMode, editorMode, flowDoodles, flowEdges, flowNodes, mindDoodles, mindEdges, mindNodes, notifyEditModeRequired, relationships, scheduleCanvasSave, schedulePreviewUpload, selectedEdgeId, tables]);

    const deleteSelectedNode = useCallback(async () => {
        if (!selectedNodeId) return;
        if (!canEdit || !editMode) {
            notifyEditModeRequired();
            return;
        }

        if (editorMode === 'db') {
            const deletedTable = tables.find((table) => String(table.id) === String(selectedNodeId));
            if (!deletedTable) return;
            const deletedColumnIds = new Set((deletedTable.columns ?? []).map((column) => Number(column.id)));
            const previousTables = tables;
            const previousRelationships = relationships;
            const nextTables = tables.filter((table) => String(table.id) !== String(selectedNodeId));
            const nextRelationships = relationships.filter((relationship) => {
                const sourceTableId = columnToTableMap[relationship.from_column_id];
                const targetTableId = columnToTableMap[relationship.to_column_id];
                if (String(sourceTableId) === String(selectedNodeId) || String(targetTableId) === String(selectedNodeId)) return false;
                if (deletedColumnIds.has(Number(relationship.from_column_id)) || deletedColumnIds.has(Number(relationship.to_column_id))) return false;
                return true;
            });
            commitEditorState(nextTables, nextRelationships, previousTables, previousRelationships);
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            try {
                setSavingState('Saving...');
                await api.delete(`/api/v1/diagram-tables/${selectedNodeId}`);
                setSavingState('Autosaved');
            } catch (deleteError) {
                setTables(previousTables);
                setRelationships(previousRelationships);
                setSavingState('Error');
                setError(deleteError.message || 'Failed to delete table.');
            }
            return;
        }

        if (editorMode === 'flow') {
            const nextNodes = flowNodes.filter((node) => node.id !== selectedNodeId);
            const nextEdges = flowEdges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId);
            commitFlowState(nextNodes, nextEdges);
            scheduleCanvasSave('flow', { nodes: nextNodes, edges: nextEdges, doodles: flowDoodles });
        }

        if (editorMode === 'mind') {
            const descendants = collectDescendantIds(selectedNodeId, mindNodes);
            const allIds = new Set([selectedNodeId, ...descendants]);
            if (descendants.length && !window.confirm('Delete selected node and descendants?')) return;
            const nextNodes = mindNodes.filter((node) => !allIds.has(node.id));
            const nextEdges = mindEdges.filter((edge) => !allIds.has(edge.source) && !allIds.has(edge.target));
            commitMindState(nextNodes, nextEdges);
            scheduleCanvasSave('mind', { nodes: nextNodes, edges: nextEdges, doodles: mindDoodles });
        }

        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    }, [canEdit, columnToTableMap, commitEditorState, commitFlowState, commitMindState, editMode, editorMode, flowDoodles, flowEdges, flowNodes, mindDoodles, mindEdges, mindNodes, notifyEditModeRequired, relationships, scheduleCanvasSave, selectedNodeId, tables]);

    const deleteSelection = useCallback(async () => {
        if (selectedDoodleId && editorMode !== 'db') {
            if (editorMode === 'flow') {
                const next = flowDoodles.filter((d) => d.id !== selectedDoodleId);
                setFlowDoodles(next);
                scheduleCanvasSave('flow', { nodes: flowNodes, edges: flowEdges, doodles: next });
            } else {
                const next = mindDoodles.filter((d) => d.id !== selectedDoodleId);
                setMindDoodles(next);
                scheduleCanvasSave('mind', { nodes: mindNodes, edges: mindEdges, doodles: next });
            }
            setSelectedDoodleId(null);
            return;
        }
        if (selectedEdgeId) {
            await deleteSelectedRelationship();
            return;
        }
        if (selectedNodeId) await deleteSelectedNode();
    }, [deleteSelectedNode, deleteSelectedRelationship, editorMode, flowDoodles, flowEdges, flowNodes, mindDoodles, mindEdges, mindNodes, scheduleCanvasSave, selectedDoodleId, selectedEdgeId, selectedNodeId]);


    useEffect(() => {
        const onKeyDown = (event) => {
            if (!canEdit) return;

            if (event.key === 'Escape') {
                drawingRef.current = { start: null, nodeId: null, type: null };
                setIsDrawingShape(false);
                setActiveTool('select');
                return;
            }

            if ((event.key === 'Delete' || event.key === 'Backspace') && (selectedEdgeId || selectedNodeId || selectedDoodleId)) {
                event.preventDefault();
                deleteSelection();
                return;
            }

            if (editorMode !== 'mind' || !editMode || !selectedNodeId) return;
            const selected = mindNodes.find((node) => node.id === selectedNodeId);
            if (!selected) return;

            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                const viewport = reactFlowRef.current?.getViewport?.() ?? { x: 0, y: 0, zoom: 1 };
                const topic = createMindRootNode({ x: Math.round(-viewport.x / viewport.zoom + 180), y: Math.round(-viewport.y / viewport.zoom + 150) }, 'Floating topic');
                commitMindState([...mindNodes, topic], mindEdges);
                setSelectedNodeId(topic.id);
                return;
            }

            if (event.key === 'Tab' && event.shiftKey) {
                event.preventDefault();
                if (selected.data?.parentId) setSelectedNodeId(selected.data.parentId);
                return;
            }

            if (event.key === 'Tab') {
                event.preventDefault();
                const childrenCount = mindNodes.filter((node) => node.data?.parentId === selected.id).length;
                const child = createMindChildNode(selected, childrenCount);
                const expandedNodes = mindNodes.map((node) => (node.id === selected.id ? { ...node, data: { ...node.data, collapsed: false } } : node));
                commitMindState([...expandedNodes, child], [...mindEdges, { id: `edge-${crypto.randomUUID()}`, source: selected.id, target: child.id, type: 'bezier', style: { stroke: selected.data?.branchColor ?? '#94a3b8', strokeWidth: 2 } }]);
                setSelectedNodeId(child.id);
                return;
            }

            if (event.key === 'Enter' && selected.data?.parentId) {
                event.preventDefault();
                const parent = mindNodes.find((node) => node.id === selected.data.parentId);
                if (!parent) return;
                const siblingsCount = mindNodes.filter((node) => node.data?.parentId === parent.id).length;
                const sibling = createMindChildNode(parent, siblingsCount);
                commitMindState([...mindNodes, sibling], [...mindEdges, { id: `edge-${crypto.randomUUID()}`, source: parent.id, target: sibling.id, type: 'bezier', style: { stroke: parent.data?.branchColor ?? '#94a3b8', strokeWidth: 2 } }]);
                setSelectedNodeId(sibling.id);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [canEdit, commitMindState, deleteSelection, editMode, editorMode, mindEdges, mindNodes, selectedDoodleId, selectedEdgeId, selectedNodeId]);

    const miniMapNodeColor = useCallback((node) => {
        if (editorMode === 'flow') return node?.data?.fillColor ?? '#cbd5e1';
        if (editorMode === 'mind') return node?.data?.branchColor ?? '#94a3b8';
        const colorValue = node?.data?.table?.color ?? node?.data?.color;
        return getTableColorMeta(colorValue).solid;
    }, [editorMode]);

    const miniMapNodeStrokeColor = useCallback((node) => {
        if (editorMode === 'flow') return node?.data?.borderColor ?? '#64748b';
        if (editorMode === 'mind') return node?.data?.branchColor ?? '#64748b';
        const colorValue = node?.data?.table?.color ?? node?.data?.color;
        return getTableColorMeta(colorValue).solid;
    }, [editorMode]);

    const submitRelationship = async (event) => {
        event.preventDefault();
        if (!relationshipDraft) return;
        if (relationshipModalState.mode === 'create') {
            try {
                const relationshipColors = relationships.map((relationship) => relationship.color).filter(Boolean);
                const color = pickNextColor(relationshipColors);
                setSavingState('Saving...');
                const response = await api.post('/api/v1/diagram-relationships', { diagram_id: Number(diagramId), from_column_id: relationshipDraft.from_column_id, to_column_id: relationshipDraft.to_column_id, type: relationshipModalState.type });
                const created = { ...(response?.data ?? response), sourceHandle: relationshipDraft.sourceHandle, targetHandle: relationshipDraft.targetHandle, color };
                commitEditorState(tables, [...relationships, created], tables, relationships);
                schedulePreviewUpload();
                setSavingState('Autosaved');
            } catch (connectError) { setSavingState('Error'); setError(connectError.message || 'Failed to create relationship.'); }
        } else {
            const relationshipId = relationshipDraft.id;
            const previous = relationships;
            const nextRelationships = relationships.map((item) => (item.id === relationshipId ? { ...item, type: relationshipModalState.type } : item));
            commitEditorState(tables, nextRelationships, tables, previous);
            try { setSavingState('Saving...'); await api.patch(`/api/v1/diagram-relationships/${relationshipId}`, { type: relationshipModalState.type }); setSavingState('Autosaved'); }
            catch (updateError) { setRelationships(previous); setSavingState('Error'); setError(updateError.message || 'Failed to update relationship.'); }
        }
        setRelationshipModalState((state) => ({ ...state, open: false }));
        setRelationshipDraft(null);
    };

    const onNodeDragStop = useCallback(async (_, node) => {
        if (editorMode === 'flow') {
            const nextNodes = flowNodes.map((entry) => (entry.id === node.id ? { ...entry, position: node.position } : entry));
            commitFlowState(nextNodes, flowEdges, flowNodes, flowEdges);
            scheduleCanvasSave('flow', { nodes: nextNodes, edges: flowEdges, doodles: flowDoodles });
            return;
        }

        if (editorMode === 'mind') {
            const nextNodes = mindNodes.map((entry) => (entry.id === node.id ? { ...entry, position: node.position } : entry));
            commitMindState(nextNodes, mindEdges, mindNodes, mindEdges);
            scheduleCanvasSave('mind', { nodes: nextNodes, edges: mindEdges, doodles: mindDoodles });
            return;
        }

        const previousTables = tables;
        const nextTables = tables.map((table) => (String(table.id) === String(node.id) ? { ...table, x: Math.round(node.position.x), y: Math.round(node.position.y), w: Math.round(node.width ?? defaultTableSize.w), h: Math.round(node.height ?? defaultTableSize.h) } : table));
        commitEditorState(nextTables, relationships, previousTables, relationships);
        try {
            setSavingState('Saving...');
            await api.patch(`/api/v1/diagram-tables/${node.id}`, { x: Math.round(node.position.x), y: Math.round(node.position.y), w: Math.round(node.width ?? defaultTableSize.w), h: Math.round(node.height ?? defaultTableSize.h) });
            schedulePreviewUpload();
            setSavingState('Autosaved');
        } catch (dragError) {
            setTables(previousTables);
            setSavingState('Error');
            if (dragError?.status === 401) return handle401();
            setError(dragError.message || 'Failed to update table position.');
        }
    }, [commitEditorState, commitFlowState, commitMindState, editorMode, flowDoodles, flowEdges, flowNodes, handle401, mindDoodles, mindEdges, mindNodes, relationships, scheduleCanvasSave, schedulePreviewUpload, tables]);

    const handleViewportSave = useCallback((viewport) => {
        if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        viewportSaveTimerRef.current = setTimeout(async () => {
            try { setSavingState('Saving...'); await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport }); setSavingState('Autosaved'); }
            catch (viewportError) { setSavingState('Error'); if (viewportError?.status === 401) return handle401(); setError(viewportError.message || 'Failed to save viewport.'); }
        }, 450);
    }, [diagramId, handle401]);

    const manualSave = async () => {
        try {
            if (!canEdit) {
                setError('No edit permission.');
                return;
            }
            setSavingState('Saving...');
            if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
            const viewport = reactFlowRef.current?.getViewport?.() ?? diagram?.viewport ?? { x: 0, y: 0, zoom: 1 };

            if (editorMode === 'db') {
                await Promise.all(nodes.map((node) => api.patch(`/api/v1/diagram-tables/${node.id}`, { x: Math.round(node.position.x), y: Math.round(node.position.y), w: Math.round(node.width ?? defaultTableSize.w), h: Math.round(node.height ?? defaultTableSize.h) })));
                await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport });
                await uploadDiagramPreview();
            } else if (editorMode === 'flow') {
                await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport, editor_mode: editorMode, flow_state: { nodes: flowNodes, edges: flowEdges, doodles: flowDoodles } });
            } else {
                await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport, editor_mode: editorMode, mind_state: { nodes: mindNodes, edges: mindEdges, doodles: mindDoodles } });
            }

            setSavingState('Saved');
        } catch (saveError) {
            setSavingState('Error');
            setError(saveError.message || 'Manual save failed.');
        }
    };



    const handleEditorModeChange = useCallback(async (nextMode) => {
        if (!['db', 'flow', 'mind'].includes(nextMode)) return;

        if (nextMode === 'db') {
            setEditorMode('db');
        } else if (nextMode === 'flow') {
            setEditorMode('flow');
        } else if (nextMode === 'mind') {
            setEditorMode('mind');
        }

        if (!canEdit) {
            setError('No edit permission.');
            return;
        }

        try {
            await api.patch(`/api/v1/diagrams/${diagramId}`, { editor_mode: nextMode });
            setDiagram((current) => ({ ...current, editor_mode: nextMode }));
        } catch (modeError) {
            setError(modeError.message || 'Failed to switch mode.');
        }
    }, [canEdit, diagramId]);

    const updateFlowNodeData = useCallback((nodeId, patch) => {
        if (!canEdit || !editMode) return;
        setFlowNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node)));
    }, [canEdit, editMode]);

    const updateMindNodeData = useCallback((nodeId, patch) => {
        if (!canEdit || !editMode) return;
        setMindNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node)));
    }, [canEdit, editMode]);

    const addFlowNode = useCallback((nodeType, position = null) => {
        if (!canEdit || !editMode) return;
        const viewport = reactFlowRef.current?.getViewport?.() ?? { x: 0, y: 0, zoom: 1 };
        const nodePosition = position ?? { x: Math.round(-viewport.x / viewport.zoom + 220), y: Math.round(-viewport.y / viewport.zoom + 120) };
        const nextNode = createFlowNode(nodeType, nodePosition);
        commitFlowState([...flowNodes, nextNode], flowEdges);
        setSelectedNodeId(nextNode.id);
    }, [canEdit, commitFlowState, editMode, flowEdges, flowNodes]);

    const addMindRoot = useCallback(() => {
        if (!canEdit || !editMode || mindNodes.length) return;
        const root = createMindRootNode({ x: 120, y: 120 });
        commitMindState([root], []);
        setSelectedNodeId(root.id);
    }, [canEdit, commitMindState, editMode, mindNodes.length]);

    const addMindChild = useCallback(() => {
        if (!canEdit || !editMode || !selectedNodeId) return;
        const parent = mindNodes.find((node) => node.id === selectedNodeId);
        if (!parent) return;
        const siblings = mindNodes.filter((node) => node.data?.parentId === parent.id).length;
        const child = createMindChildNode(parent, siblings);
        const expandedNodes = mindNodes.map((node) => (node.id === parent.id ? { ...node, data: { ...node.data, collapsed: false } } : node));
        commitMindState([...expandedNodes, child], [...mindEdges, { id: `edge-${crypto.randomUUID()}`, source: parent.id, target: child.id, type: 'bezier', style: { stroke: parent.data?.branchColor ?? '#94a3b8', strokeWidth: 2 } }]);
        setSelectedNodeId(child.id);
    }, [canEdit, commitMindState, editMode, mindEdges, mindNodes, selectedNodeId]);

    const commitFlowLabel = useCallback((nodeId, label) => {
        const nextNodes = flowNodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label, text: label } } : node));
        commitFlowState(nextNodes, flowEdges);
        scheduleCanvasSave('flow', { nodes: nextNodes, edges: flowEdges, doodles: flowDoodles });
    }, [commitFlowState, flowDoodles, flowEdges, flowNodes, scheduleCanvasSave]);

    const commitMindLabel = useCallback((nodeId, label) => {
        const nextNodes = mindNodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label, text: label } } : node));
        commitMindState(nextNodes, mindEdges);
        scheduleCanvasSave('mind', { nodes: nextNodes, edges: mindEdges, doodles: mindDoodles });
    }, [commitMindState, mindDoodles, mindEdges, mindNodes, scheduleCanvasSave]);

    const handleToggleMindCollapse = useCallback((nodeId, collapsed) => {
        const nextNodes = mindNodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, collapsed } } : node));
        commitMindState(nextNodes, mindEdges);
        scheduleCanvasSave('mind', { nodes: nextNodes, edges: mindEdges, doodles: mindDoodles });
    }, [commitMindState, mindDoodles, mindEdges, mindNodes, scheduleCanvasSave]);

    const handleDoodlePointerDown = useCallback((event) => {
        if (!(canEdit && editMode) || activeTool !== 'pen' || editorMode === 'db') return;
        const rect = event.currentTarget.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSelectedDoodleId(null);
        setActiveStroke({ id: `stroke-${Date.now()}`, points: [point], color: toolStyle.stroke, strokeWidth: 2.5, userId: authUser?.id ?? null, userName: authUser?.name ?? 'User' });
    }, [authUser?.id, authUser?.name, canEdit, activeTool, editMode, editorMode, toolStyle.stroke]);

    const handleDoodlePointerMove = useCallback((event) => {
        if (!activeStroke) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        setActiveStroke((current) => (current ? { ...current, points: [...current.points, point] } : current));
    }, [activeStroke]);

    const handleDoodlePointerUp = useCallback(() => {
        if (!activeStroke || activeStroke.points.length < 2) {
            setActiveStroke(null);
            return;
        }

        const nextDoodle = { ...activeStroke, createdAt: new Date().toISOString(), mode: editorMode };

        if (editorMode === 'flow') {
            const next = [...flowDoodles, nextDoodle];
            setFlowDoodles(next);
            scheduleCanvasSave('flow', { nodes: flowNodes, edges: flowEdges, doodles: next });
        }
        if (editorMode === 'mind') {
            const next = [...mindDoodles, nextDoodle];
            setMindDoodles(next);
            scheduleCanvasSave('mind', { nodes: mindNodes, edges: mindEdges, doodles: next });
        }

        setSelectedDoodleId(nextDoodle.id);
        setActiveStroke(null);
    }, [activeStroke, editorMode, flowDoodles, flowEdges, flowNodes, mindDoodles, mindEdges, mindNodes, scheduleCanvasSave]);

    const cursorClass = useMemo(() => {
        if (editorMode !== 'flow') return 'cursor-default';
        if (activeTool === 'pan') return isPanning ? 'cursor-grabbing' : 'cursor-grab';
        if (activeTool === 'connector' || FLOW_DRAW_TOOLS.includes(activeTool) || activeTool === 'pen') return 'cursor-crosshair';
        return 'cursor-default';
    }, [activeTool, editorMode, isPanning]);

    const renderedNodes = useMemo(() => {
        if (editorMode === 'db') return Array.isArray(activeNodes) ? activeNodes : [];

        const baseNodes = (Array.isArray(activeNodes) ? activeNodes : []).filter((node) => (showInk ? true : node.type !== 'inkNode'));
        return baseNodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                editMode: canEdit && editMode,
                onLabelChange: editorMode === 'flow' ? commitFlowLabel : commitMindLabel,
                onToggleCollapse: handleToggleMindCollapse,
            },
        }));
    }, [activeNodes, canEdit, commitFlowLabel, commitMindLabel, editMode, editorMode, handleToggleMindCollapse, showInk]);

    const submitAddTable = async (event) => {
        event.preventDefault();
        if (!canEdit || !editMode) return;
        setFormErrors({});
        try {
            const tableColors = tables.map((table) => table.color).filter(Boolean);
            const color = pickNextColor(tableColors);
            setSavingState('Saving...');
            const defaultDimensions = computeTableDimensions({ name: addTableForm.name, columns: [] });
            const response = await api.post('/api/v1/diagram-tables', { diagram_id: Number(diagramId), name: addTableForm.name, schema: addTableForm.schema || null, color, x: 120, y: 120, w: defaultDimensions.width, h: defaultDimensions.height });
            const nextTables = [...tables, { ...normalizeTable(response?.data ?? response), color }];
            commitEditorState(nextTables, relationships, tables, relationships);
            schedulePreviewUpload();
            setShowAddTableModal(false);
            setAddTableForm({ name: '', schema: '' });
            setSavingState('Autosaved');
        } catch (submitError) {
            setSavingState('Error');
            const validationErrors = submitError?.payload?.errors ?? {};
            setFormErrors(Object.keys(validationErrors).length ? validationErrors : { general: [submitError.message || 'Failed to create table.'] });
        }
    };

    const submitAddColumn = async (event, submittedForm = addColumnForm) => {
        event.preventDefault();
        if (!canEdit || !editMode) return;
        const sourceForm = submittedForm;
        const previousTables = tables;
        setFormErrors({});
        try {
            setSavingState('Saving...');
            if (columnModalMode === 'create') {
                const response = await api.post('/api/v1/diagram-columns', { diagram_table_id: Number(sourceForm.tableId), name: sourceForm.name, type: sourceForm.type, nullable: sourceForm.nullable, primary: sourceForm.primary, unique: sourceForm.unique, default: sourceForm.default || null });
                const createdColumn = response?.data ?? response;
                const nextTables = tables.map((table) => (String(table.id) === String(sourceForm.tableId) ? { ...table, columns: [...(table.columns ?? []), createdColumn] } : table));
                commitEditorState(nextTables, relationships, previousTables, relationships);
                schedulePreviewUpload();
                setNodes((nds) => nds.map((n) => (n.id === String(sourceForm.tableId) ? { ...n } : n)));
            } else {
                const response = await api.patch(`/api/v1/diagram-columns/${editingColumn.id}`, { name: sourceForm.name, type: sourceForm.type, nullable: sourceForm.nullable, primary: sourceForm.primary, unique: sourceForm.unique, default: sourceForm.default || null });
                const updatedColumn = response?.data ?? response;
                const nextTables = tables.map((table) => ({ ...table, columns: (table.columns ?? []).map((column) => (Number(column.id) === Number(updatedColumn.id) ? updatedColumn : column)) }));
                commitEditorState(nextTables, relationships, previousTables, relationships);
                schedulePreviewUpload();
            }
            setShowAddColumnModal(false); setEditingColumn(null); setAddColumnForm(defaultColumnForm); setSavingState('Autosaved');
        } catch (submitError) {
            setTables(previousTables);
            setSavingState('Error');
            const validationErrors = submitError?.payload?.errors ?? {};
            setFormErrors(Object.keys(validationErrors).length ? validationErrors : { general: [submitError.message || 'Failed to save column.'] });
        }
    };

    const focusOnTable = useCallback((tableId) => {
        const node = nodes.find((entry) => entry.id === String(tableId));
        if (!node) return;
        reactFlowRef.current?.setCenter(node.position.x + 160, node.position.y + 100, { zoom: 1.1, duration: 500 });
    }, [nodes]);

    const handleImport = async (payload) => { setSavingState('Saving...'); await api.post(`/api/v1/diagrams/${diagramId}/import`, payload); await loadDiagram(); setSavingState('Saved'); };


    const resolveDiagramCaptureElements = () => {
        const flowRoot = document.querySelector('.react-flow');
        const viewportElement = flowRoot?.querySelector('.react-flow__viewport');
        const instance = reactFlowRef.current;

        if (!flowRoot || !viewportElement || !instance) {
            return null;
        }

        return {
            viewportElement,
            width: Math.max(1, Math.round(flowRoot.clientWidth || 1)),
            height: Math.max(1, Math.round(flowRoot.clientHeight || 1)),
            instance,
        };
    };

    const exportDownload = async (url, filename, mime = 'text/plain') => {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Export failed.');
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([blob], { type: mime }));
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    async function exportImage() {
        const captureTarget = resolveDiagramCaptureElements();
        if (!captureTarget) {
            alert('Diagram not found');
            return;
        }

        const { viewportElement, width, height, instance } = captureTarget;
        const nodesForBounds = instance.getNodes?.() ?? [];
        const safeNodes = nodesForBounds.filter((node) => Number.isFinite(node?.position?.x) && Number.isFinite(node?.position?.y));

        if (!safeNodes.length) {
            alert('Add at least one table before exporting.');
            return;
        }

        const originalViewport = instance.getViewport?.() ?? { x: 0, y: 0, zoom: 1 };

        try {
            const bounds = getRectOfNodes(safeNodes);
            const targetViewport = getViewportForBounds(bounds, width, height, 0.2, 2);
            await instance.setViewport?.(targetViewport, { duration: 0 });
            await new Promise((resolve) => requestAnimationFrame(resolve));

            const dataUrl = await toPng(viewportElement, {
                backgroundColor: '#f8fafc',
                pixelRatio: 2,
                cacheBust: true,
                useCORS: true,
                filter: (node) => {
                    if (!node?.classList) return true;
                    return !Array.from(node.classList).some((className) => EXCLUDED_CAPTURE_CLASSES.has(className));
                },
            });

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'diagram.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('PNG export failed:', error);
            if (isImageSecurityError(error)) {
                setError(IMAGE_EXPORT_SECURITY_MESSAGE);
                alert(IMAGE_EXPORT_SECURITY_MESSAGE);
                return;
            }
            alert('PNG export failed.');
        } finally {
            await instance.setViewport?.(originalViewport, { duration: 0 });
        }
    }

    const nodeTypes = useMemo(() => {
        try {
            if (editorMode === 'flow') {
                return flowNodeTypes && typeof flowNodeTypes === 'object'
                    ? flowNodeTypes
                    : { fallbackFlowNode: (() => null) };
            }

            if (editorMode === 'mind') {
                return mindNodeTypes && typeof mindNodeTypes === 'object'
                    ? mindNodeTypes
                    : { fallbackMindNode: (() => null) };
            }

            return { tableNode: TableNode ?? (() => null) };
        } catch (nodeTypeError) {
            console.error('nodeTypes error', nodeTypeError);
            return { tableNode: TableNode ?? (() => null) };
        }
    }, [editorMode]);

    if (loading) return <section className="flex h-screen items-center justify-center"><p className="text-sm text-slate-600">Loading diagram…</p></section>;

    if (!canView) {
        return <section className="flex h-screen items-center justify-center"><p className="text-sm text-slate-600">You do not have access to view this diagram.</p></section>;
    }

    return (
        <>
            <Head title={diagram?.name ? `Diagram: ${diagram.name}` : `Diagram ${diagramId}`} />
            <section className="flex h-screen bg-slate-100">
                {editorMode === 'db' && (
                    <Sidebar
                        diagramName={diagram?.name || `Diagram #${diagramId}`}
                        tables={tables}
                        isCollapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
                        onFocusTable={focusOnTable}
                        onFocusColumn={setSelectedColumnId}
                        onAddTable={() => { if (!canEdit || !editMode) return; setFormErrors({}); setShowAddTableModal(true); }}
                        onAddColumn={onAddColumn}
                        onEditColumn={onEditColumn}
                        onDeleteColumn={onDeleteColumn}
                        onUpdateTableColor={onUpdateTableColor}
                        editMode={canEdit && editMode}
                        onToggleEditMode={() => { if (!canEdit) return; setEditMode((current) => !current); setActiveEditTableId(null); }}
                        canEdit={canEdit}
                    />
                )}
                {editorMode === 'flow' && (
                    <FlowSidebar
                        isCollapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
                        onAddNode={addFlowNode}
                        selectedNode={flowNodes.find((node) => node.id === selectedNodeId)}
                        onUpdateNode={updateFlowNodeData}
                        onFocusNode={(nodeId) => {
                            setSelectedNodeId(nodeId);
                            const node = flowNodes.find((entry) => entry.id === nodeId);
                            if (node) reactFlowRef.current?.setCenter(node.position.x, node.position.y, { zoom: 1.1, duration: 350 });
                        }}
                        nodes={flowNodes}
                        editMode={canEdit && editMode}
                    />
                )}
                {editorMode === 'mind' && (
                    <MindSidebar
                        isCollapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
                        nodes={mindNodes}
                        selectedNode={mindNodes.find((node) => node.id === selectedNodeId)}
                        onAddRoot={addMindRoot}
                        onAddChild={addMindChild}
                        onDeleteNode={deleteSelectedNode}
                        onUpdateNode={updateMindNodeData}
                        onFocusNode={(nodeId) => {
                            setSelectedNodeId(nodeId);
                            const node = mindNodes.find((entry) => entry.id === nodeId);
                            if (node) reactFlowRef.current?.setCenter(node.position.x, node.position.y, { zoom: 1.1, duration: 350 });
                        }}
                        editMode={canEdit && editMode}
                    />
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    <Toolbar
                        savingState={savingState}
                        onSave={manualSave}
                        onExport={() => setShowExportModal(true)}
                        onExportImage={exportImage}
                        onUndo={undoHistory}
                        onRedo={redoHistory}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onDeleteSelection={deleteSelection}
                        canDeleteSelection={Boolean(selectedEdgeId || selectedNodeId || selectedDoodleId)}
                        isViewOnly={!canEdit}
                        editorMode={editorMode}
                        onEditorModeChange={handleEditorModeChange}
                        canChangeMode={canEdit}
                        editMode={editMode}
                        onToggleEditMode={() => { if (!canEdit) return; setEditMode((current) => !current); setActiveEditTableId(null); }}
                        showMiniMap={showMiniMap}
                        onToggleMiniMap={() => setShowMiniMap((current) => !current)}
                        showGrid={showGrid}
                        onToggleGrid={() => setShowGrid((current) => !current)}
                    />

                    {!editMode && <div className="mx-4 mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">View mode</div>}
                    {editModeNotice && <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{editModeNotice}</div>}

                    {error && (
                        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <span>{error}</span>
                            {showSignInCta && <button type="button" onClick={() => router.get('/login')} className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Sign in</button>}
                        </div>
                    )}

                    <div className={`relative m-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${cursorClass}`}>

                        <FloatingToolbox
                            mode={editorMode}
                            activeTool={activeTool}
                            onSelectTool={setActiveTool}
                            showInk={showInk}
                            onToggleInk={() => setShowInk((current) => !current)}
                            editMode={canEdit && editMode}
                        />
                        <ReactFlow
                            nodes={Array.isArray(renderedNodes) ? renderedNodes : []}
                            edges={Array.isArray(activeEdges) ? activeEdges : []}
                            nodeTypes={nodeTypes}
                            fitView
                            onInit={(instance) => { reactFlowRef.current = instance; }}
                            panOnDrag={editorMode === 'db' ? true : activeTool === 'pan'}
                            nodesDraggable={editorMode === 'db' ? canEdit && editMode : canEdit && editMode && activeTool === 'select'}
                            elementsSelectable={editorMode === 'db' ? true : ['select', 'connector', 'child', 'topic'].includes(activeTool)}
                            selectionOnDrag={activeTool === 'select'}
                            snapToGrid={editorMode !== 'db'}
                            snapGrid={[15, 15]}
                            onNodesChange={onNodesChange}
                            onNodeDragStop={onNodeDragStop}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onEdgeClick={onEdgeClick}
                            onEdgeDoubleClick={onEdgeDoubleClick}
                            onPaneMouseMove={editorMode === 'flow' ? handlePaneMouseMove : undefined}
                            onPaneMouseDown={editorMode === 'flow' ? handlePaneMouseDown : undefined}
                            onPaneMouseUp={editorMode === 'flow' ? handlePaneMouseUp : undefined}
                            onPaneMouseLeave={editorMode === 'flow' ? handlePaneMouseUp : undefined}
                            onPaneClick={(event) => {
                                setSelectedEdgeId(null);
                                setSelectedNodeId(null);
                                if (!(canEdit && editMode) || editorMode === 'db') return;
                                const position = toFlowPoint(event.clientX, event.clientY);
                                if (editorMode === 'mind' && activeTool === 'topic') {
                                    const topic = createMindRootNode(position, 'Topic');
                                    const nextNodes = [...mindNodes, topic];
                                    commitMindState(nextNodes, mindEdges);
                                    scheduleCanvasSave('mind', { nodes: nextNodes, edges: mindEdges, doodles: mindDoodles });
                                    setSelectedNodeId(topic.id);
                                    setActiveTool('select');
                                }
                            }}
                            onEdgesChange={onEdgesChange}
                            onMoveEnd={(_, viewport) => handleViewportSave(viewport)}
                            onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
                                const firstNode = selectedNodes?.[0] ?? null;
                                const firstEdge = selectedEdges?.[0] ?? null;
                                setSelectedNodeId(firstNode?.id ?? null);
                                setSelectedEdgeId(firstEdge?.id ?? null);
                            }}
                            proOptions={{ hideAttribution: true }}
                            defaultEdgeOptions={{ type: 'bezier' }}
                            connectionMode={editorMode === 'db' ? 'strict' : (activeTool === 'connector' ? 'loose' : 'strict')}
                            nodesConnectable={editorMode === 'db' ? canEdit && editMode : canEdit && editMode && activeTool === 'connector'}
                        >
                            {showGrid && <Background gap={20} size={1} color="#cbd5e1" />}
                            {showMiniMap && <MiniMap position="bottom-right" pannable zoomable nodeColor={miniMapNodeColor} nodeStrokeColor={miniMapNodeStrokeColor} />}
                            <Controls position="bottom-left" showInteractive={false}>
                                {canEdit && (
                                    <ControlButton onClick={() => setEditMode((current) => !current)} title="Toggle edit mode">
                                        <i className={`fa-solid fa-pen-to-square ${editMode ? 'text-indigo-600' : 'text-slate-600'}`} />
                                    </ControlButton>
                                )}
                                <ControlButton onClick={() => reactFlowRef.current?.fitView({ padding: 0.2, duration: 200 })} title="Fit view">
                                    <i className="fa-solid fa-expand" />
                                </ControlButton>
                            </Controls>
                        </ReactFlow>

                        {editorMode !== 'db' && (
                            <DoodleLayer
                                enabled={canEdit && editMode && activeTool === 'pen'}
                                visible={showInk}
                                doodles={editorMode === 'flow' ? flowDoodles : mindDoodles}
                                activeStroke={activeStroke}
                                selectedId={selectedDoodleId}
                                onSelect={setSelectedDoodleId}
                                onPointerDown={handleDoodlePointerDown}
                                onPointerMove={handleDoodlePointerMove}
                                onPointerUp={handleDoodlePointerUp}
                            />
                        )}
                        {editorMode !== 'db' && editMode && (selectedNodeId || selectedEdgeId) && (
                            <SelectionInspector
                                mode={editorMode}
                                selectedNode={(editorMode === 'flow' ? flowNodes : mindNodes).find((n) => n.id === selectedNodeId) ?? null}
                                selectedEdge={(editorMode === 'flow' ? flowEdges : mindEdges).find((e) => e.id === selectedEdgeId) ?? null}
                                onUpdateNode={(updates) => {
                                    if (!selectedNodeId) return;
                                    if (editorMode === 'flow') {
                                        const next = flowNodes.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n));
                                        setFlowNodes(next);
                                        scheduleCanvasSave('flow', { nodes: next, edges: flowEdges, doodles: flowDoodles });
                                    } else {
                                        const next = mindNodes.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n));
                                        setMindNodes(next);
                                        scheduleCanvasSave('mind', { nodes: next, edges: mindEdges, doodles: mindDoodles });
                                    }
                                }}
                                onUpdateEdge={(updates) => {
                                    if (!selectedEdgeId) return;
                                    if (editorMode === 'flow') {
                                        const next = flowEdges.map((e) => (e.id === selectedEdgeId ? { ...e, ...updates } : e));
                                        setFlowEdges(next);
                                        scheduleCanvasSave('flow', { nodes: flowNodes, edges: next, doodles: flowDoodles });
                                    } else {
                                        const next = mindEdges.map((e) => (e.id === selectedEdgeId ? { ...e, ...updates } : e));
                                        setMindEdges(next);
                                        scheduleCanvasSave('mind', { nodes: mindNodes, edges: next, doodles: mindDoodles });
                                    }
                                }}
                                onDelete={deleteSelection}
                            />
                        )}
                    </div>
                </div>
            </section>

            <AddTableModal open={showAddTableModal} form={addTableForm} errors={formErrors} onChange={(field, value) => setAddTableForm((current) => ({ ...current, [field]: value }))} onClose={() => setShowAddTableModal(false)} onSubmit={submitAddTable} />
            <AddColumnModal isOpen={showAddColumnModal} mode={columnModalMode} form={addColumnForm} column={editingColumn} errors={formErrors} onClose={() => { setShowAddColumnModal(false); setEditingColumn(null); setAddColumnForm(defaultColumnForm); }} onSubmit={submitAddColumn} />
            <RelationshipModal isOpen={relationshipModalState.open} mode={relationshipModalState.mode} relationshipType={relationshipModalState.type} onTypeChange={(type) => setRelationshipModalState((state) => ({ ...state, type }))} onClose={() => { setRelationshipModalState((state) => ({ ...state, open: false })); setRelationshipDraft(null); }} onSubmit={submitRelationship} />
            <ImportModal open={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} />
            <ExportModal
                open={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExportSql={async () => {
                    await exportDownload(`/api/v1/diagrams/${diagramId}/export-sql`, 'schema.sql', 'text/sql');
                    setShowExportModal(false);
                }}
                onExportMigrations={async () => {
                    await exportDownload(`/api/v1/diagrams/${diagramId}/export-migrations`, 'migrations.zip', 'application/zip');
                    setShowExportModal(false);
                }}
                onExportJson={async () => {
                    let payload = {};
                    if (editorMode === 'db') {
                        const latestDiagram = await api.get(`/api/v1/diagrams/${diagramId}`);
                        payload = latestDiagram?.data ?? latestDiagram;
                    } else {
                        payload = {
                            mode: editorMode,
                            nodes: editorMode === 'flow' ? flowNodes : mindNodes,
                            edges: editorMode === 'flow' ? flowEdges : mindEdges,
                            viewport: reactFlowRef.current?.getViewport?.() ?? diagram?.viewport ?? { x: 0, y: 0, zoom: 1 },
                        };
                    }
                    const text = JSON.stringify(payload, null, 2);
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
                    link.download = `diagram-${diagramId}-${editorMode}.json`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                    setShowExportModal(false);
                }}
                editorMode={editorMode}
            />
            <OpenDiagramModal open={showOpenModal} diagrams={allDiagrams} onClose={() => setShowOpenModal(false)} onOpen={(selected) => router.visit(`/diagrams/${selected.id}`)} />
            <NewDiagramModal open={showNewModal} teams={teams} onClose={() => setShowNewModal(false)} onCreate={async (payload) => { const created = await api.post('/api/v1/diagrams', payload); router.visit(`/diagrams/${created?.id}`); }} />
            {canManageAccess && <ShareAccessModal diagram={diagram} teams={teams} open={showShareModal} onClose={() => setShowShareModal(false)} />}
        </>
    );
}

export default function DiagramEditor() {
    return (
        <ReactFlowProvider>
            <EditorErrorBoundary>
                <DiagramEditorContent />
            </EditorErrorBoundary>
        </ReactFlowProvider>
    );
}

DiagramEditor.layout = (page) => page;
