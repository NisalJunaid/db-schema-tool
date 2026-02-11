import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const permissionOptions = ['manage_teams', 'manage_users', 'manage_diagrams'];

export default function AdminUsersIndex() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');

    const loadUsers = async (term = '') => {
        const data = await api.get(`/api/v1/admin/users${term ? `?search=${encodeURIComponent(term)}` : ''}`);
        setUsers(Array.isArray(data) ? data : data?.data || []);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    return (
        <>
            <Head title="User Access" />
            <div className="rounded-xl border bg-white p-6">
                <h1 className="text-xl font-semibold">User Access Management</h1>
                <input
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        loadUsers(e.target.value);
                    }}
                    className="mt-4 w-full rounded border px-3 py-2"
                    placeholder="Search by name or email"
                />
                <div className="mt-4 space-y-3">
                    {users.map((user) => (
                        <div key={user.id} className="rounded border p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-xs text-slate-500">{user.email}</p>
                                </div>
                                <select
                                    value={user.role}
                                    onChange={async (e) => {
                                        await api.patch(`/api/v1/admin/users/${user.id}/role`, { role: e.target.value });
                                        loadUsers(search);
                                    }}
                                    className="rounded border px-2 py-1"
                                >
                                    <option value="super_admin">super_admin</option>
                                    <option value="admin">admin</option>
                                    <option value="member">member</option>
                                </select>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                {permissionOptions.map((permission) => {
                                    const checked = (user.permissions || []).includes(permission);
                                    return (
                                        <label key={permission} className="flex items-center gap-1">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={async (e) => {
                                                    const next = e.target.checked
                                                        ? [...(user.permissions || []), permission]
                                                        : (user.permissions || []).filter((item) => item !== permission);
                                                    await api.patch(`/api/v1/admin/users/${user.id}/permissions`, { permissions: next });
                                                    loadUsers(search);
                                                }}
                                            />
                                            {permission}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
