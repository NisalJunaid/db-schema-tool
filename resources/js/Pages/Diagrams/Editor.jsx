import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Background, ControlButton, Controls, MiniMap, ReactFlow, ReactFlowProvider, applyNodeChanges } from 'reactflow';
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
import { asCollection, computeTableDimensions, getTableColorMeta, parseColumnIdFromHandle, relationshipLabel, toColumnHandleId } from '@/Components/Diagram/utils';
import { api, SESSION_EXPIRED_MESSAGE } from '@/lib/api';

const defaultTableSize = { w: 320, h: 240 };
const defaultColumnForm = { tableId: '', preset: '', name: '', type: 'VARCHAR(255)', nullable: false, primary: false, unique: false, default: '' };
const diagramColorPalette = ['#6366f1', '#0ea5e9', '#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e'];

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
    const { diagramId } = usePage().props;
    const reactFlowRef = useRef(null);
    const viewportSaveTimerRef = useRef(null);
    const editModeNoticeTimerRef = useRef(null);

    const [diagram, setDiagram] = useState(null);
    const [tables, setTables] = useState([]);
    const [relationships, setRelationships] = useState([]);
    const [nodes, setNodes] = useState([]);
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
    const [editModeNotice, setEditModeNotice] = useState('');
    const [history, setHistory] = useState({ past: [], present: null, future: [] });

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

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

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
    }, [buildSnapshot]);

    const redoHistory = useCallback(() => {
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
    }, [buildSnapshot]);

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
            setDiagram(diagramPayload);
            setTables(normalizedTables);
            setRelationships(relationshipRows);
            setHistory({ past: [], present: buildSnapshot(normalizedTables, relationshipRows), future: [] });
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

    useEffect(() => () => {
        if (editModeNoticeTimerRef.current) clearTimeout(editModeNoticeTimerRef.current);
    }, []);

    const onRenameTable = useCallback(async (tableId, name) => {
        if (!editMode) return;
        const previousTables = tables;
        const nextTables = tables.map((entry) => (entry.id === tableId ? { ...entry, name } : entry));
        commitEditorState(nextTables, relationships, previousTables, relationships);
        try {
            setSavingState('Saving...');
            await api.patch(`/api/v1/diagram-tables/${tableId}`, { name });
            setSavingState('Autosaved');
        } catch (renameError) {
            setTables(previousTables);
            setHistory((current) => ({ ...current, present: buildSnapshot(previousTables, relationships), past: current.past.slice(0, -1) }));
            setSavingState('Error');
            if (renameError?.status === 401) return handle401();
            setError(renameError.message || 'Failed to rename table.');
        }
    }, [buildSnapshot, commitEditorState, editMode, handle401, relationships, tables]);

    const onUpdateTableColor = useCallback(async (tableId, color) => {
        if (!editMode) return;
        const previousTables = tables;
        const nextTables = tables.map((table) => (table.id === tableId ? { ...table, color } : table));
        commitEditorState(nextTables, relationships, previousTables, relationships);
        try {
            setSavingState('Saving...');
            await api.patch(`/api/v1/diagram-tables/${tableId}`, { color });
            setSavingState('Autosaved');
        } catch (updateError) {
            setTables(previousTables);
            setSavingState('Error');
            setError(updateError.message || 'Failed to update table color.');
        }
    }, [commitEditorState, editMode, relationships, tables]);

    const onAddColumn = useCallback((tableId) => { setFormErrors({}); setColumnModalMode('create'); setEditingColumn(null); setAddColumnForm({ ...defaultColumnForm, tableId: String(tableId) }); setShowAddColumnModal(true); }, []);
    const onEditColumn = useCallback((column) => { setFormErrors({}); setColumnModalMode('edit'); setEditingColumn(column); setAddColumnForm({ ...defaultColumnForm, tableId: String(column.diagram_table_id), name: column.name, type: column.type, nullable: Boolean(column.nullable), primary: Boolean(column.primary), unique: Boolean(column.unique), default: column.default ?? '' }); setShowAddColumnModal(true); }, []);

    const onDeleteColumn = useCallback(async (columnId) => {
        if (!editMode || !window.confirm('Delete this field?')) return;
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
    }, [commitEditorState, editMode, relationships, tables]);

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

    const onNodesChange = useCallback((changes) => {
        setNodes((current) => applyNodeChanges(changes, current));
    }, []);

    const onConnect = useCallback((connection) => {
        if (!editMode) return;
        const sourceColumnId = parseColumnIdFromHandle(connection.sourceHandle);
        const targetColumnId = parseColumnIdFromHandle(connection.targetHandle);
        if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) return;
        const isDuplicate = relationships.some((entry) => Number(entry.from_column_id) === sourceColumnId && Number(entry.to_column_id) === targetColumnId);
        if (isDuplicate) return;
        setRelationshipDraft({ sourceHandle: connection.sourceHandle, targetHandle: connection.targetHandle, from_column_id: sourceColumnId, to_column_id: targetColumnId });
        setRelationshipModalState({ open: true, mode: 'create', type: 'one_to_many' });
    }, [editMode, relationships]);

    const onNodeClick = useCallback((_, node) => {
        setSelectedNodeId(String(node.id));
        setSelectedEdgeId(null);
    }, []);

    const onEdgeClick = useCallback((_, edge) => {
        setSelectedEdgeId(String(edge.id));
        setSelectedNodeId(null);
    }, []);

    const onEdgeDoubleClick = useCallback((_, edge) => {
        if (!editMode) return;
        const relationship = relationships.find((entry) => String(entry.id) === String(edge.id));
        if (!relationship) return;
        setRelationshipDraft(relationship);
        setRelationshipModalState({ open: true, mode: 'edit', type: relationship.type ?? 'one_to_many' });
    }, [editMode, relationships]);

    const deleteSelectedRelationship = useCallback(async () => {
        if (!selectedEdgeId) return;
        if (!editMode) {
            notifyEditModeRequired();
            return;
        }
        const previousRelationships = relationships;
        const nextRelationships = relationships.filter((relationship) => String(relationship.id) !== String(selectedEdgeId));
        commitEditorState(tables, nextRelationships, tables, previousRelationships);
        setSelectedEdgeId(null);
        try {
            setSavingState('Saving...');
            await api.delete(`/api/v1/diagram-relationships/${selectedEdgeId}`);
            setSavingState('Autosaved');
        } catch (deleteError) {
            setRelationships(previousRelationships);
            setSavingState('Error');
            setError(deleteError.message || 'Failed to delete relationship.');
        }
    }, [commitEditorState, editMode, notifyEditModeRequired, relationships, selectedEdgeId, tables]);

    const deleteSelectedNode = useCallback(async () => {
        if (!selectedNodeId) return;
        if (!editMode) {
            notifyEditModeRequired();
            return;
        }
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
    }, [columnToTableMap, commitEditorState, editMode, notifyEditModeRequired, relationships, selectedNodeId, tables]);

    const deleteSelection = useCallback(async () => {
        if (selectedEdgeId) {
            await deleteSelectedRelationship();
            return;
        }
        if (selectedNodeId) await deleteSelectedNode();
    }, [deleteSelectedNode, deleteSelectedRelationship, selectedEdgeId, selectedNodeId]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== 'Delete' && event.key !== 'Backspace') return;
            if (!selectedEdgeId && !selectedNodeId) return;
            event.preventDefault();
            deleteSelection();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [deleteSelection, selectedEdgeId, selectedNodeId]);

    const miniMapNodeColor = useCallback((node) => {
        const colorValue = node?.data?.table?.color ?? node?.data?.color;
        return getTableColorMeta(colorValue).solid;
    }, []);

    const miniMapNodeStrokeColor = useCallback((node) => {
        const colorValue = node?.data?.table?.color ?? node?.data?.color;
        return getTableColorMeta(colorValue).solid;
    }, []);

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
        const previousTables = tables;
        const nextTables = tables.map((table) => (String(table.id) === String(node.id) ? { ...table, x: Math.round(node.position.x), y: Math.round(node.position.y), w: Math.round(node.width ?? defaultTableSize.w), h: Math.round(node.height ?? defaultTableSize.h) } : table));
        commitEditorState(nextTables, relationships, previousTables, relationships);
        try {
            setSavingState('Saving...');
            await api.patch(`/api/v1/diagram-tables/${node.id}`, { x: Math.round(node.position.x), y: Math.round(node.position.y), w: Math.round(node.width ?? defaultTableSize.w), h: Math.round(node.height ?? defaultTableSize.h) });
            setSavingState('Autosaved');
        } catch (dragError) {
            setTables(previousTables);
            setSavingState('Error');
            if (dragError?.status === 401) return handle401();
            setError(dragError.message || 'Failed to update table position.');
        }
    }, [commitEditorState, handle401, relationships, tables]);

    const handleViewportSave = useCallback((viewport) => {
        if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        viewportSaveTimerRef.current = setTimeout(async () => {
            try { setSavingState('Saving...'); await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport }); setSavingState('Autosaved'); }
            catch (viewportError) { setSavingState('Error'); if (viewportError?.status === 401) return handle401(); setError(viewportError.message || 'Failed to save viewport.'); }
        }, 450);
    }, [diagramId, handle401]);

    const manualSave = async () => {
        try {
            setSavingState('Saving...');
            if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
            const viewport = reactFlowRef.current?.getViewport?.() ?? diagram?.viewport ?? { x: 0, y: 0, zoom: 1 };
            await Promise.all(nodes.map((node) => api.patch(`/api/v1/diagram-tables/${node.id}`, { x: Math.round(node.position.x), y: Math.round(node.position.y), w: Math.round(node.width ?? defaultTableSize.w), h: Math.round(node.height ?? defaultTableSize.h) })));
            await api.patch(`/api/v1/diagrams/${diagramId}`, { viewport });
            setSavingState('Saved');
        } catch (saveError) {
            setSavingState('Error');
            setError(saveError.message || 'Manual save failed.');
        }
    };

    const submitAddTable = async (event) => {
        event.preventDefault();
        if (!editMode) return;
        setFormErrors({});
        try {
            const tableColors = tables.map((table) => table.color).filter(Boolean);
            const color = pickNextColor(tableColors);
            setSavingState('Saving...');
            const defaultDimensions = computeTableDimensions({ name: addTableForm.name, columns: [] });
            const response = await api.post('/api/v1/diagram-tables', { diagram_id: Number(diagramId), name: addTableForm.name, schema: addTableForm.schema || null, color, x: 120, y: 120, w: defaultDimensions.width, h: defaultDimensions.height });
            const nextTables = [...tables, { ...normalizeTable(response?.data ?? response), color }];
            commitEditorState(nextTables, relationships, tables, relationships);
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
        if (!editMode) return;
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
                setNodes((nds) => nds.map((n) => (n.id === String(sourceForm.tableId) ? { ...n } : n)));
            } else {
                const response = await api.patch(`/api/v1/diagram-columns/${editingColumn.id}`, { name: sourceForm.name, type: sourceForm.type, nullable: sourceForm.nullable, primary: sourceForm.primary, unique: sourceForm.unique, default: sourceForm.default || null });
                const updatedColumn = response?.data ?? response;
                const nextTables = tables.map((table) => ({ ...table, columns: (table.columns ?? []).map((column) => (Number(column.id) === Number(updatedColumn.id) ? updatedColumn : column)) }));
                commitEditorState(nextTables, relationships, previousTables, relationships);
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

    const exportImage = async () => {
        const target = document.querySelector('.react-flow__viewport');
        if (!target) return;
        const pngDataUrl = await toPng(target, {
            pixelRatio: 2,
            backgroundColor: '#f8fafc',
        });

        const link = document.createElement('a');
        link.download = 'diagram.png';
        link.href = pngDataUrl;
        link.click();
    };

    const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

    if (loading) return <section className="flex h-screen items-center justify-center"><p className="text-sm text-slate-600">Loading diagram…</p></section>;

    return (
        <>
            <Head title={diagram?.name ? `Diagram: ${diagram.name}` : `Diagram ${diagramId}`} />
            <section className="flex h-screen bg-slate-100">
                <Sidebar
                    diagramName={diagram?.name || `Diagram #${diagramId}`}
                    tables={tables}
                    isCollapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
                    onFocusTable={focusOnTable}
                    onFocusColumn={setSelectedColumnId}
                    onAddTable={() => { if (!editMode) return; setFormErrors({}); setShowAddTableModal(true); }}
                    onAddColumn={onAddColumn}
                    onEditColumn={onEditColumn}
                    onDeleteColumn={onDeleteColumn}
                    onUpdateTableColor={onUpdateTableColor}
                    editMode={editMode}
                    onToggleEditMode={() => { setEditMode((current) => !current); setActiveEditTableId(null); }}
                />

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
                        onToggleGrid={() => setShowGrid((current) => !current)}
                    />

                    {!editMode && <div className="mx-4 mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">View mode</div>}
                    {editModeNotice && <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{editModeNotice}</div>}

                    {error && (
                        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <span>{error}</span>
                            <button type="button" onClick={() => router.get('/login')} className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Sign in</button>
                        </div>
                    )}

                    <div className="m-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            fitView
                            onInit={(instance) => { reactFlowRef.current = instance; }}
                            nodesDraggable={editMode}
                            onNodesChange={onNodesChange}
                            onNodeDragStop={onNodeDragStop}
                            onConnect={onConnect}
                            onNodeClick={onNodeClick}
                            onEdgeClick={onEdgeClick}
                            onEdgeDoubleClick={onEdgeDoubleClick}
                            onPaneClick={() => { setSelectedEdgeId(null); setSelectedNodeId(null); }}
                            onMoveEnd={(_, viewport) => handleViewportSave(viewport)}
                            proOptions={{ hideAttribution: true }}
                            defaultEdgeOptions={{ type: 'bezier' }}
                            connectionMode="strict"
                        >
                            {showGrid && <Background gap={20} size={1} color="#cbd5e1" />}
                            {showMiniMap && <MiniMap pannable zoomable nodeColor={miniMapNodeColor} nodeStrokeColor={miniMapNodeStrokeColor} />}
                            <Controls showInteractive={false} position="bottom-left">
                                <ControlButton onClick={() => setEditMode((current) => !current)} title="Edit mode" className={editMode ? '!bg-indigo-600 !text-white hover:!bg-indigo-700' : ''}>
                                    <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                                    <span className="sr-only">Edit mode</span>
                                </ControlButton>
                            </Controls>
                        </ReactFlow>
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
                    const latestDiagram = await api.get(`/api/v1/diagrams/${diagramId}`);
                    const payload = JSON.stringify(latestDiagram?.data ?? latestDiagram, null, 2);
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
                    link.download = `diagram-${diagramId}.json`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                    setShowExportModal(false);
                }}
            />
            <OpenDiagramModal open={showOpenModal} diagrams={allDiagrams} onClose={() => setShowOpenModal(false)} onOpen={(selected) => router.visit(`/diagrams/${selected.id}`)} />
            <NewDiagramModal open={showNewModal} teams={teams} onClose={() => setShowNewModal(false)} onCreate={async (payload) => { const created = await api.post('/api/v1/diagrams', payload); router.visit(`/diagrams/${created?.id}`); }} />
        </>
    );
}

export default function DiagramEditor() {
    return (
        <ReactFlowProvider>
            <DiagramEditorContent />
        </ReactFlowProvider>
    );
}

DiagramEditor.layout = (page) => page;
