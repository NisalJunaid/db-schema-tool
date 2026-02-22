import { useMemo, useState } from 'react';

export default function ImportModal({ open, onClose, onImport }) {
    const [mode, setMode] = useState('sql');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const accept = useMemo(() => (mode === 'json' ? '.json,application/json' : '.sql,text/plain'), [mode]);

    if (!open) {
        return null;
    }

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError('');
        setSubmitting(true);

        try {
            const text = await file.text();
            const payload = mode === 'json' ? JSON.parse(text) : { sql: text };
            await onImport(payload);
            onClose();
        } catch (importError) {
            setError(importError.message || 'Unable to import file.');
        } finally {
            setSubmitting(false);
            event.target.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">Import schema</h2>
                <p className="mt-1 text-sm text-slate-500">Choose SQL (CREATE TABLE) or exported JSON.</p>

                <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={() => setMode('sql')} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === 'sql' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        Import SQL
                    </button>
                    <button type="button" onClick={() => setMode('json')} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === 'json' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        Import JSON
                    </button>
                </div>

                <label className="mt-4 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600 hover:bg-slate-50">
                    <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={submitting} />
                    {submitting ? 'Importing…' : 'Choose file'}
                </label>

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
