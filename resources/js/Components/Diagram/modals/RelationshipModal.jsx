import { RELATIONSHIP_TYPE_OPTIONS } from '@/Components/Diagram/utils';

export default function RelationshipModal({ isOpen, mode = 'create', relationshipType, onTypeChange, onClose, onSubmit }) {
    if (!isOpen) {
        return null;
    }

    const isEdit = mode === 'edit';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit relationship' : 'Create relationship'}</h2>

                <form className="mt-4 space-y-4" onSubmit={onSubmit}>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Relationship type</label>
                        <select
                            value={relationshipType}
                            onChange={(event) => onTypeChange(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                            {RELATIONSHIP_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                            Cancel
                        </button>
                        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
                            {isEdit ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
