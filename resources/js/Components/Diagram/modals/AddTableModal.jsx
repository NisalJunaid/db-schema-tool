export default function AddTableModal({ open, form, onChange, onClose, onSubmit, errors = {} }) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">Add table</h2>
                <form className="mt-4 space-y-4" onSubmit={onSubmit}>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Table name</label>
                        <input
                            required
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={form.name}
                            onChange={(event) => onChange('name', event.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Schema (optional)</label>
                        <input
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={form.schema}
                            onChange={(event) => onChange('schema', event.target.value)}
                        />
                    </div>

                    {errors?.general?.[0] && <p className="text-sm text-red-600">{errors.general[0]}</p>}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                            Cancel
                        </button>
                        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
                            Create table
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
