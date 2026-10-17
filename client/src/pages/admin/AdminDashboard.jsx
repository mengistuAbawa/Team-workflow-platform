import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Users,
  UserPlus,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  MoreVertical,
  Activity,
  Edit2,
  Trash2,
  Power,
  ShieldCheck,
  Briefcase,
  Layers,
  Clock,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import adminService from "../../services/adminService";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";

const roleBadges = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  member: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "member",
  });

  // Edit User Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    full_name: "",
    email: "",
    role: "member",
    is_active: 1,
    password: "",
  });

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statsRes, usersRes] = await Promise.all([
        adminService.getSystemStats(),
        adminService.getUsers(),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data?.users || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load administrative data. Verify your administrator permissions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreatingUser(true);
    setError("");

    try {
      await adminService.createUser(createForm);
      setCreateModalOpen(false);
      setCreateForm({
        fullName: "",
        email: "",
        password: "",
        role: "member",
      });
      await loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user account.");
    } finally {
      setCreatingUser(false);
    }
  }

  function openEditModal(u) {
    setEditForm({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      password: "",
    });
    setEditModalOpen(true);
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    setEditingUser(true);
    setError("");

    try {
      const payload = {
        full_name: editForm.full_name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await adminService.updateUser(editForm.id, payload);
      setEditModalOpen(false);
      await loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user account.");
    } finally {
      setEditingUser(false);
    }
  }

  async function handleToggleStatus(u) {
    try {
      await adminService.toggleUserStatus(u.id);
      await loadAdminData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not change user active status."
      );
    }
  }

  async function handleDeleteUser(u) {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the account for ${u.full_name}?`
      )
    ) {
      return;
    }

    try {
      await adminService.deleteUser(u.id);
      await loadAdminData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete user account.");
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search.trim() ||
      `${u.full_name} ${u.email}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading && !stats) return <Loader label="Loading administrative console..." />;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 p-6 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-400/30">
            <ShieldCheck size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-purple-500/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-200">
                System Administration
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              System Control Center
            </h1>
            <p className="mt-1 text-sm text-purple-200/80">
              Manage accounts, configure system roles, and oversee all workspace operations.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadAdminData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500"
          >
            <UserPlus size={18} />
            Create User Account
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Global Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Accounts</p>
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Users size={20} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats?.users?.total || 0}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-purple-700">
              {stats?.users?.admins || 0} Admins
            </span>
            <span>&bull;</span>
            <span className="font-semibold text-blue-700">
              {stats?.users?.managers || 0} Managers
            </span>
            <span>&bull;</span>
            <span className="font-semibold text-emerald-700">
              {stats?.users?.members || 0} Members
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Active Workspaces</p>
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FolderKanban size={20} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats?.projects?.total || 0}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold">
              {stats?.projects?.active || 0} Active
            </span>
            <span>&bull;</span>
            <span>{stats?.projects?.planning || 0} Planning</span>
            <span>&bull;</span>
            <span>{stats?.projects?.completed || 0} Done</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">System Tasks</p>
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Layers size={20} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats?.tasks?.total || 0}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-amber-600 font-semibold">
              {stats?.tasks?.in_review || 0} Pending Review
            </span>
            <span>&bull;</span>
            <span className="text-blue-600">
              {stats?.tasks?.in_progress || 0} In Progress
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Security & Health</p>
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ShieldAlert size={20} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-600">100%</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span>MySQL 8.x Active</span>
            <span>&bull;</span>
            <span>JWT Auth Enforced</span>
          </div>
        </div>
      </div>

      {/* User Management Hub */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              User Accounts & System Roles
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Administrator provisions and controls all accounts across TeamFlow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email..."
                className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 sm:w-64"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-purple-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="manager">Managers</option>
              <option value="member">Team Members</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Workspaces & Tasks</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const badge = roleBadges[u.role] || roleBadges.member;
                const isActive = u.is_active === 1 || u.is_active === true;

                return (
                  <tr key={u.id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 font-bold text-white text-xs shadow-sm">
                          {(u.full_name || "U")
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.full_name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${badge}`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          isActive ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        {isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">
                          {u.project_count || 0}
                        </span>{" "}
                        projects
                      </p>
                      <p className="text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {u.task_count || 0}
                        </span>{" "}
                        tasks ({u.completed_task_count || 0} done)
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          title="Edit user details"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-purple-700"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          title={isActive ? "Deactivate account" : "Activate account"}
                          className={`rounded-lg border p-2 ${
                            isActive
                              ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <Power size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          title="Delete account"
                          className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No users match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* System Audit Activity Stream */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              System Audit Activity
            </h2>
            <p className="text-sm text-slate-500">
              Live log of actions performed across the entire platform.
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Activity size={20} />
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {(stats?.recentActivities || []).map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-4 py-3 text-xs sm:text-sm"
            >
              <div>
                <p className="font-semibold text-slate-800">
                  <span className="text-purple-700 font-bold">
                    {log.user_name || "System"}
                  </span>{" "}
                  {log.action}
                  {log.task_title && (
                    <span className="font-medium text-slate-600">
                      {" "}
                      on task "{log.task_title}"
                    </span>
                  )}
                  {log.project_name && (
                    <span className="text-slate-500">
                      {" "}
                      in [{log.project_name}]
                    </span>
                  )}
                </p>
                {log.details && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {typeof log.details === "string"
                      ? log.details
                      : JSON.stringify(log.details)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {new Date(log.created_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
            <p className="py-6 text-center text-xs text-slate-400">
              No recent audit activity logged yet.
            </p>
          )}
        </div>
      </section>

      {/* Create User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Team Account"
        description="Admin provisions member, manager, or administrator accounts."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Full Name *
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={createForm.fullName}
              onChange={(e) =>
                setCreateForm({ ...createForm, fullName: e.target.value })
              }
              placeholder="e.g. Sarah Jenkins"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Email Address *
            </label>
            <input
              type="email"
              required
              maxLength={190}
              value={createForm.email}
              onChange={(e) =>
                setCreateForm({ ...createForm, email: e.target.value })
              }
              placeholder="sarah@example.com"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Temporary Password * (min. 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={72}
              value={createForm.password}
              onChange={(e) =>
                setCreateForm({ ...createForm, password: e.target.value })
              }
              placeholder="Initial password"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Assigned System Role *
            </label>
            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm({ ...createForm, role: e.target.value })
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-purple-500"
            >
              <option value="member">Team Member (Task execution & collaboration)</option>
              <option value="manager">Project Manager (Allocation & task review)</option>
              <option value="admin">Administrator (Full system control)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingUser}
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
            >
              {creatingUser ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User Account"
        description="Update account credentials, role hierarchy, or status."
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={editForm.full_name}
              onChange={(e) =>
                setEditForm({ ...editForm, full_name: e.target.value })
              }
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={editForm.email}
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              System Role *
            </label>
            <select
              value={editForm.role}
              onChange={(e) =>
                setEditForm({ ...editForm, role: e.target.value })
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-purple-500"
            >
              <option value="member">Team Member</option>
              <option value="manager">Project Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Reset Password (optional)
            </label>
            <input
              type="password"
              minLength={8}
              placeholder="Leave blank to keep existing password"
              value={editForm.password}
              onChange={(e) =>
                setEditForm({ ...editForm, password: e.target.value })
              }
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={editForm.is_active === 1 || editForm.is_active === true}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    is_active: e.target.checked ? 1 : 0,
                  })
                }
                className="size-4 rounded accent-purple-600"
              />
              <span className="text-sm font-semibold text-slate-700">
                Account Active & Allowed to Sign In
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editingUser}
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
            >
              {editingUser ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
