import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  CalendarDays,
  Bell,
  MessageCircle,
  Settings,
  Zap,
  X,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRoleDashboardPath } from "../../routes/ProtectedRoute";

// Static links shown to every authenticated user. The dashboard entry is
// injected dynamically below based on the user's role.
const commonLinks = [
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "My Tasks", path: "/tasks", icon: CheckSquare },
  { label: "Team", path: "/team", icon: Users },
  { label: "Messages", path: "/messages", icon: MessageCircle },
  { label: "Calendar", path: "/calendar", icon: CalendarDays },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

const dashboardLabels = {
  admin: "Admin Console",
  manager: "Manager Dashboard",
  member: "Dashboard",
};

const dashboardIcons = {
  admin: ShieldCheck,
  manager: ClipboardList,
  member: LayoutDashboard,
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const role = user?.role || "member";
  const dashboardPath = getRoleDashboardPath(role);
  const DashboardIcon = dashboardIcons[role] || LayoutDashboard;
  const dashboardLabel = dashboardLabels[role] || "Dashboard";
  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#17172E] text-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500">
              <Zap size={22} fill="currentColor" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">TeamFlow</p>
              <p className="text-xs text-slate-400">Work, together.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>

          <nav className="space-y-1">
            <NavLink
              to={dashboardPath}
              onClick={onClose}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-950/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <DashboardIcon size={19} strokeWidth={1.8} />
              <span>{dashboardLabel}</span>
            </NavLink>

            {role === "admin" && (
              <NavLink
                to="/manager/dashboard"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-950/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <ClipboardList size={19} strokeWidth={1.8} />
                <span>Manager View</span>
              </NavLink>
            )}

            {commonLinks.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-950/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-violet-300">
              <Zap size={17} />
              <span className="text-sm font-semibold">TeamFlow Pro</span>
            </div>
            <p className="text-xs leading-5 text-slate-400">
              Keep your projects organized and your team moving forward.
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 rounded-full bg-violet-400" />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Workspace overview
            </p>
          </div>

          <NavLink
            to="/settings"
            onClick={onClose}
            className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <Settings size={19} />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}
