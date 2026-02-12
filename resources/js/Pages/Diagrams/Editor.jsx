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
import FloatingCanvasToolbar from '@/Components/CanvasShared/FloatingCanvasToolbar';
import SelectionToolbar from '@/Components/CanvasShared/SelectionToolbar';
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
    const { diagramId, permissions: pagePermissions = {}, diagram: initialDiagramPayload = null } = usePage().props;
    const reactFlowRef = useRef(null);
    const viewportSaveTimerRef = useRef(null);
    const editModeNoticeTimerRef = useRef(null);
    const previewUploadTimerRef = useRef(null);

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
    const [dragCreating, setDragCreating] = useState(null);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [selectionToolbarPosition, setSelectionToolbarPosition] = useState(null);
    const [editModeNotice, setEditModeNotice] = useState('');
    const [history, setHistory] = useState({ past: [], present: null, future: [] });
    const [flowHistory, setFlowHistory] = useState({ past: [], present: null, future: [] });
    const [mindHistory, setMindHistory] = useState({ past: [], present: null, future: [] });

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

    const buildSnapshot = useCallback((sourceTables, sourceRelationships) => ({
        tables: cloneState(sourceTables),
        relationships: cloneState(sourceRelationships),
    }), []);

    const buildCanvasSnapshot = useCallback((sourceNodes, sourceEdges) => ({
        nodes: cloneState(sourceNodes),
        edges: cloneState(sourceEdges),
    }), []);

    const commitEditorState = useCallback((nextTables, nextRelationships, previousTables = tables, previousRelationships = relationships) => {
        setHistory((current) => ({
            past: [...current.past, buildSnapshot(previousTables, previousRelationships)],
            present: buildSnapshot(nextTables, nextRelationships),
            future: [],
        }));
        setTables(nextTables);
        setRelationships(nextRelationships);
    }, [buildSnapshot, relationships, tables]);

    const undoHistory = useCallback(() => {
        if (editorMode === 'db') {
            setHistory((current) => {
                if (!current.past.length) return current;
                const previous = current.past[current.past.length - 1];
                const futureHead = current.present ? [buildSnapshot(current.present.tables, current.present.relationships)] : [];
                setTables(cloneState(previous.tables));
                setRelationships(cloneState(previous.relationships));
                setSelectedEdgeId(null);
                return {
                    past: current.past.slice(0, -1),
                    present: buildSnapshot(previous.tables, previous.relationships),
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
    }, [buildCanvasSnapshot, buildSnapshot, editorMode]);

    const redoHistory = useCallback(() => {
        if (editorMode === 'db') {
            setHistory((current) => {
                if (!current.future.length) return current;
                const [next, ...remainingFuture] = current.future;
                const nextPast = current.present ? [...current.past, buildSnapshot(current.present.tables, current.present.relationships)] : current.past;
                setTables(cloneState(next.tables));
                setRelationships(cloneState(next.relationships));
                setSelectedEdgeId(null);
                return {
                    past: nextPast,
                    present: buildSnapshot(next.tables, next.relationships),
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
    }, [buildCanvasSnapshot, buildSnapshot, editorMode]);

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
            } else {
                setFlowNodes(loadedFlowNodes);
                setFlowEdges(loadedFlowEdges);
            }

            if (diagramPayload?.editor_mode === 'mind') {
                setMindNodes(Array.isArray(diagramPayload.mind_state?.nodes) ? diagramPayload.mind_state.nodes : []);
                setMindEdges(Array.isArray(diagramPayload.mind_state?.edges) ? diagramPayload.mind_state.edges : []);
            } else {
                setMindNodes(loadedMindNodes);
                setMindEdges(loadedMindEdges);
            }
            setHistory({ past: [], present: buildSnapshot(normalizedTables, relationshipRows), future: [] });
            setFlowHistory({ past: [], present: { nodes: cloneState(loadedFlowNodes), edges: cloneState(loadedFlowEdges) }, future: [] });
            setMindHistory({ past: [], present: { nodes: cloneState(loadedMindNodes), edges: cloneState(loadedMindEdges) }, future: [] });
        } catch (loadError) {
            if (loadError?.status === 401) return handle401();
            setError(loadError.message || 'Unable to load diagram.');
        } finally {
            setLoading(false);
        }
    }, [buildSnapshot, diagramId, handle401]);

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

    useEffect(() => () => {
        if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        if (editModeNoticeTimerRef.current) clearTimeout(editModeNoticeTimerRef.current);
        if (previewUploadTimerRef.current) clearTimeout(previewUploadTimerRef.current);
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
            setHistory((current) => ({ ...current, present: buildSnapshot(previousTables, relationships), past: current.past.slice(0, -1) }));
            setSavingState('Error');
            if (renameError?.status === 401) return handle401();
            setError(renameError.message || 'Failed to rename table.');
        }
    }, [buildSnapshot, canEdit, commitEditorState, editMode, handle401, relationships, schedulePreviewUpload, tables]);

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
            setFlowNodes((current) => applyNodeChanges(changes, current));
            return;
        }

        setMindNodes((current) => applyNodeChanges(changes, current));
    }, [editorMode]);

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
            commitFlowState(flowNodes, addEdge(nextEdge, flowEdges));
        }

        if (editorMode === 'mind') {
            commitMindState(mindNodes, addEdge({ ...nextEdge, style: { stroke: '#94a3b8', strokeWidth: 1.8 } }, mindEdges));
        }
    }, [canEdit, commitFlowState, commitMindState, editMode, editorMode, flowEdges, flowNodes, mindEdges, mindNodes, relationships]);

    const onNodeClick = useCallback((_, node) => {
        setSelectedNodeId(String(node.id));
        setSelectedEdgeId(null);
    }, []);

    const onEdgeClick = useCallback((_, edge) => {
        setSelectedEdgeId(String(edge.id));
        setSelectedNodeId(null);
    }, []);

    const onEdgeDoubleClick = useCallback((_, edge) => {
        if (!canEdit || !editMode) return;

        if (editorMode !== 'db') {
            setSelectedEdgeId(edge.id);
            return;
        }

        const relationship = relationships.find((entry) => String(entry.id) === String(edge.id));
        if (!relationship) return;
        setRelationshipDraft(relationship);
        setRelationshipModalState({ open: true, mode: 'edit', type: relationship.type ?? 'one_to_many' });
    }, [canEdit, editMode, editorMode, relationships]);

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
        }

        if (editorMode === 'mind') {
            const nextEdges = mindEdges.filter((edge) => edge.id !== selectedEdgeId);
            commitMindState(mindNodes, nextEdges);
        }

        setSelectedEdgeId(null);
    }, [canEdit, commitEditorState, commitFlowState, commitMindState, editMode, editorMode, flowEdges, flowNodes, mindEdges, mindNodes, notifyEditModeRequired, relationships, schedulePreviewUpload, selectedEdgeId, tables]);

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
        }

        if (editorMode === 'mind') {
            const descendants = collectDescendantIds(selectedNodeId, mindNodes);
            const allIds = new Set([selectedNodeId, ...descendants]);
            if (descendants.length && !window.confirm('Delete selected node and descendants?')) return;
            const nextNodes = mindNodes.filter((node) => !allIds.has(node.id));
            const nextEdges = mindEdges.filter((edge) => !allIds.has(edge.source) && !allIds.has(edge.target));
            commitMindState(nextNodes, nextEdges);
        }

        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    }, [canEdit, columnToTableMap, commitEditorState, commitFlowState, commitMindState, editMode, editorMode, flowEdges, flowNodes, mindEdges, mindNodes, notifyEditModeRequired, relationships, selectedNodeId, tables]);

    const deleteSelection = useCallback(async () => {
        if (selectedEdgeId) {
            await deleteSelectedRelationship();
            return;
        }
        if (selectedNodeId) await deleteSelectedNode();
    }, [deleteSelectedNode, deleteSelectedRelationship, selectedEdgeId, selectedNodeId]);


    useEffect(() => {
        const onKeyDown = (event) => {
            if (!canEdit) return;

            if ((event.key === 'Delete' || event.key === 'Backspace') && (selectedEdgeId || selectedNodeId)) {
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
    }, [canEdit, commitMindState, deleteSelection, editMode, editorMode, mindEdges, mindNodes, selectedEdgeId, selectedNodeId]);

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
            return;
        }

        if (editorMode === 'mind') {
            const nextNodes = mindNodes.map((entry) => (entry.id === node.id ? { ...entry, position: node.position } : entry));
            commitMindState(nextNodes, mindEdges, mindNodes, mindEdges);
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
    }, [commitEditorState, commitFlowState, commitMindState, editorMode, flowEdges, flowNodes, handle401, mindEdges, mindNodes, relationships, schedulePreviewUpload, tables]);

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
                await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport, editor_mode: editorMode, flow_state: { nodes: flowNodes, edges: flowEdges } });
            } else {
                await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport, editor_mode: editorMode, mind_state: { nodes: mindNodes, edges: mindEdges } });
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

    useEffect(() => {
        if (!canEdit || editorMode === 'db') return;
        const timer = window.setTimeout(async () => {
            try {
                const viewport = reactFlowRef.current?.getViewport?.() ?? diagram?.viewport ?? { x: 0, y: 0, zoom: 1 };
                setSavingState('Saving...');
                if (editorMode === 'flow') {
                    await api.patch(`/api/v1/diagrams/${diagramId}`, { editor_mode: editorMode, flow_state: { nodes: flowNodes, edges: flowEdges }, viewport });
                } else {
                    await api.patch(`/api/v1/diagrams/${diagramId}`, { editor_mode: editorMode, mind_state: { nodes: mindNodes, edges: mindEdges }, viewport });
                }
                setSavingState('Autosaved');
            } catch (saveError) {
                setSavingState('Error');
            }
        }, 500);

        return () => window.clearTimeout(timer);
    }, [canEdit, diagram?.viewport, diagramId, editorMode, flowEdges, flowNodes, mindEdges, mindNodes]);

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
                        onImport={() => setShowImportModal(true)}
                        onExport={() => setShowExportModal(true)}
                        onExportImage={exportImage}
                        onNewDiagram={() => setShowNewModal(true)}
                        onOpenDiagram={() => setShowOpenModal(true)}
                        onUndo={undoHistory}
                        onRedo={redoHistory}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onDeleteSelection={deleteSelection}
                        canDeleteSelection={Boolean(selectedEdgeId || selectedNodeId)}
                        showMiniMap={showMiniMap}
                        showGrid={showGrid}
                        onToggleMiniMap={() => setShowMiniMap((current) => !current)}
                        onToggleGrid={() => setShowGrid((prev) => !prev)}
                        canManageAccess={canManageAccess}
                        onManageAccess={() => setShowShareModal(true)}
                        isViewOnly={!canEdit}
                        editorMode={editorMode}
                        onEditorModeChange={handleEditorModeChange}
                        canChangeMode={canEdit}
                        onQuickAddFlowShape={() => addFlowNode('rectangle')}
                    />

                    {!editMode && <div className="mx-4 mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">View mode</div>}
                    {editModeNotice && <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{editModeNotice}</div>}

                    {error && (
                        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <span>{error}</span>
                            {showSignInCta && <button type="button" onClick={() => router.get('/login')} className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Sign in</button>}
                        </div>
                    )}

                    <div className="relative m-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                        <FloatingCanvasToolbar
                            editorMode={editorMode}
                            activeTool={activeTool}
                            setActiveTool={setActiveTool}
                            onAddNode={addFlowNode}
                            onAddChild={addMindChild}
                            onAddSibling={addMindSibling}
                            onToggleMiniMap={() => setShowMiniMap((current) => !current)}
                            showMiniMap={showMiniMap}
                        />
                        <ReactFlow
                            nodes={Array.isArray(activeNodes) ? activeNodes : []}
                            edges={Array.isArray(activeEdges) ? activeEdges : []}
                            nodeTypes={nodeTypes}
                            fitView
                            onInit={(instance) => { reactFlowRef.current = instance; }}
                            panOnDrag={editorMode !== 'db' ? activeTool === 'pan' : true}
                            nodesDraggable={editorMode === 'db' ? canEdit && editMode : activeTool === 'select' && canEdit && editMode}
                            elementsSelectable={editorMode === 'db' ? true : activeTool === 'select'}
                            selectionOnDrag
                            snapToGrid={editorMode !== 'db'}
                            snapGrid={[15, 15]}
                            onNodesChange={onNodesChange}
                            onNodeDragStop={onNodeDragStop}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onEdgeClick={onEdgeClick}
                            onEdgeDoubleClick={onEdgeDoubleClick}
                            onPaneMouseMove={(event) => {
                                setCursorPosition({ x: event.clientX + 10, y: event.clientY + 10 });
                                if (editorMode === 'flow' && dragCreating) {
                                    const point = toFlowPoint(event.clientX, event.clientY);
                                    setDragCreating((current) => (current ? { ...current, current: point } : current));
                                }
                            }}
                            onPaneMouseDown={(event) => {
                                if (!(canEdit && editMode) || editorMode !== 'flow' || !['rect', 'diamond', 'circle'].includes(activeTool)) return;
                                const start = toFlowPoint(event.clientX, event.clientY);
                                setDragCreating({ start, current: start, tool: activeTool });
                            }}
                            onPaneMouseUp={() => {
                                if (!(canEdit && editMode) || !dragCreating || editorMode !== 'flow') return;
                                const width = Math.abs(dragCreating.current.x - dragCreating.start.x);
                                const height = Math.abs(dragCreating.current.y - dragCreating.start.y);
                                const position = { x: Math.min(dragCreating.start.x, dragCreating.current.x), y: Math.min(dragCreating.start.y, dragCreating.current.y) };
                                const nodeType = dragCreating.tool === 'rect' ? 'rectangle' : dragCreating.tool;
                                const nextNode = createFlowNode(nodeType, position, { width: width || 160, height: height || 100 });
                                commitFlowState([...flowNodes, nextNode], flowEdges);
                                setSelectedNodeId(nextNode.id);
                                setDragCreating(null);
                                setActiveTool('select');
                            }}
                            onPaneClick={(event) => {
                                setSelectedEdgeId(null);
                                setSelectedNodeId(null);
                                if (!(canEdit && editMode) || editorMode === 'db') return;
                                const position = toFlowPoint(event.clientX, event.clientY);
                                if (editorMode === 'flow' && activeTool !== 'select' && activeTool !== 'pan' && activeTool !== 'arrow' && !['rect', 'diamond', 'circle'].includes(activeTool)) {
                                    const map = { text: 'text', sticky: 'sticky' };
                                    const nextNode = createFlowNode(map[activeTool] ?? 'rectangle', position);
                                    commitFlowState([...flowNodes, nextNode], flowEdges);
                                    setSelectedNodeId(nextNode.id);
                                    setActiveTool('select');
                                }
                                if (editorMode === 'mind' && activeTool === 'topic') {
                                    addMindFloatingTopic(position);
                                    setActiveTool('select');
                                }
                            }}
                            onEdgesChange={onEdgesChange}
                            onMoveEnd={(_, viewport) => handleViewportSave(viewport)}
                            onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
                                const firstNode = selectedNodes?.[0] ?? null;
                                const firstEdge = selectedEdges?.[0] ?? null;
                                if (firstNode) setSelectedNodeId(firstNode.id);
                                if (firstEdge) setSelectedEdgeId(firstEdge.id);
                                const pos = firstNode
                                    ? { x: (firstNode.positionAbsolute?.x ?? firstNode.position.x) + 80, y: (firstNode.positionAbsolute?.y ?? firstNode.position.y) - 18 }
                                    : firstEdge
                                        ? { x: 280, y: 18 }
                                        : null;
                                setSelectionToolbarPosition(pos);
                            }}
                            proOptions={{ hideAttribution: true }}
                            defaultEdgeOptions={{ type: 'bezier' }}
                            connectionMode={editorMode === 'db' ? 'strict' : 'loose'}
                        >
                            {showGrid && <Background gap={20} size={1} color="#cbd5e1" />}
                            {showMiniMap && <MiniMap pannable zoomable nodeColor={miniMapNodeColor} nodeStrokeColor={miniMapNodeStrokeColor} />}
                            {canEdit && (
                                <Controls showInteractive={false} position="bottom-left">
                                    <ControlButton onClick={() => setEditMode((current) => !current)} title="Edit mode" className={editMode ? '!bg-indigo-600 !text-white hover:!bg-indigo-700' : ''}>
                                        <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                                        <span className="sr-only">Edit mode</span>
                                    </ControlButton>
                                </Controls>
                            )}
                        </ReactFlow>
                        {editorMode !== 'db' && dragCreating && (
                            <div
                                className="pointer-events-none absolute rounded-lg border border-indigo-400 bg-indigo-100/30"
                                style={{
                                    left: Math.min(dragCreating.start.x, dragCreating.current.x),
                                    top: Math.min(dragCreating.start.y, dragCreating.current.y),
                                    width: Math.abs(dragCreating.current.x - dragCreating.start.x),
                                    height: Math.abs(dragCreating.current.y - dragCreating.start.y),
                                }}
                            />
                        )}
                        <SelectionToolbar
                            editorMode={editorMode}
                            position={selectionToolbarPosition}
                            selectedNode={activeNodes.find((node) => node.id === selectedNodeId)}
                            selectedEdge={activeEdges.find((edge) => edge.id === selectedEdgeId)}
                            editMode={canEdit && editMode}
                            onUpdateNode={editorMode === 'flow' ? updateFlowNodeData : updateMindNodeData}
                            onUpdateEdge={(edgeId, patch) => {
                                if (editorMode === 'flow') setFlowEdges((current) => current.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)));
                                if (editorMode === 'mind') setMindEdges((current) => current.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)));
                            }}
                            onDelete={deleteSelection}
                            onToggleCollapse={() => updateMindNodeData(selectedNodeId, { collapsed: !(mindNodes.find((node) => node.id === selectedNodeId)?.data?.collapsed) })}
                            onBringForward={() => setFlowNodes((current) => current.map((node) => (node.id === selectedNodeId ? { ...node, zIndex: (node.zIndex ?? 0) + 1 } : node)))}
                            onSendBackward={() => setFlowNodes((current) => current.map((node) => (node.id === selectedNodeId ? { ...node, zIndex: Math.max(0, (node.zIndex ?? 1) - 1) } : node)))}
                        />
                        {editorMode !== 'db' && activeTool !== 'select' && (
                            <div className="cursor-tool fixed z-40 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow" style={{ left: cursorPosition.x, top: cursorPosition.y }}>
                                <i className="fa-solid fa-wand-magic-sparkles mr-1" aria-hidden="true" />
                                {activeTool}
                            </div>
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
