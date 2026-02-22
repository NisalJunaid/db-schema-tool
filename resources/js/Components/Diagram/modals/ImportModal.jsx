import { useState } from 'react';
import { api } from '@/lib/api';

export default function ImportModal({ open, onClose, diagramId, onImported }) {
    const [mode, setMode] = useState('sql');
    const [sqlText, setSqlText] = useState('');
    const [jsonText, setJsonText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!open) {
        return null;
    }

    const handleJsonFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            setJsonText(text);
            setError('');
        } catch {
            setError('Unable to read JSON file.');
        } finally {
            event.target.value = '';
        }
    };

    const submitImport = async (type, content) => {
        setSubmitting(true);
        setError('');

        try {
            await api.post(`/api/v1/diagrams/${diagramId}/import`, {
                type,
                content,
            });

            await onImported?.();
            onClose();
            setSqlText('');
            setJsonText('');
        } catch (importError) {
            setError(importError?.message || 'Unable to import diagram content.');
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmitSql = async () => {
        if (!sqlText.trim()) {
            setError('Please provide SQL content to import.');
            return;
        }

        await submitImport('sql', sqlText);
    };

    const onSubmitJson = async () => {
        if (!jsonText.trim()) {
            setError('Please provide JSON content to import.');
            return;
        }

        await submitImport('json', jsonText);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">Import schema</h2>
                <p className="mt-1 text-sm text-slate-500">Import database structure from SQL or JSON.</p>

                <div className="mt-4 flex items-center gap-2 border-b border-slate-200 pb-3">
                    <button type="button" onClick={() => setMode('sql')} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === 'sql' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        SQL
                    </button>
                    <button type="button" onClick={() => setMode('json')} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === 'json' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        JSON
                    </button>
                </div>

                {mode === 'sql' && (
                    <div className="mt-4 space-y-3">
                        <textarea
                            rows={12}
                            value={sqlText}
                            onChange={(event) => setSqlText(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                            placeholder="Paste CREATE TABLE SQL here"
                            disabled={submitting}
                        />
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onSubmitSql}
                                disabled={submitting}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {submitting ? 'Importing…' : 'Import SQL'}
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'json' && (
                    <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-slate-700">Upload JSON file</label>
                        <input
                            type="file"
                            accept=".json,application/json"
                            onChange={handleJsonFile}
                            disabled={submitting}
                            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700"
                        />
                        <textarea
                            rows={10}
                            value={jsonText}
                            onChange={(event) => setJsonText(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                            placeholder="Paste JSON diagram payload here"
                            disabled={submitting}
                        />
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onSubmitJson}
                                disabled={submitting}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {submitting ? 'Importing…' : 'Import JSON'}
                            </button>
                        </div>
                    </div>
                )}

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                <div className="mt-5 flex justify-end">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
