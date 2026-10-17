import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute, { getRoleDashboardPath } from "./routes/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import Loader from "./components/common/Loader";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Calendar from "./pages/Calendar";
import MyTasks from "./pages/MyTasks";
import Notifications from "./pages/Notifications";
import ProjectDetails from "./pages/ProjectDetails";
import CreateProject from "./pages/CreateProject";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import Messages from "./pages/Messages";
import ProjectTasks from "./pages/projects/ProjectTasks";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import { useAuth } from "./context/AuthContext";

// Temporary page for features that are not implemented yet.
function ComingSoon({ title }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>

      <p className="mt-2 text-sm text-slate-500">
        This page will be connected to the database in the next implementation
        step.
      </p>
    </section>
  );
}

// Redirect root path to the user's role-specific dashboard,
// or to /login if not authenticated.
function RoleRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <Loader label="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleDashboardPath(user.role)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Default route — redirects to the role-specific dashboard */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin-only routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Manager routes (manager + admin can access) */}
      <Route element={<ProtectedRoute allowedRoles={["manager", "admin"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        </Route>
      </Route>

      {/* General protected routes (all roles) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Projects */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<CreateProject />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />

          {/* Tasks belonging to a specific project */}
          <Route path="/projects/:projectId/tasks" element={<ProjectTasks />} />

          {/* Other pages */}
          <Route path="/tasks" element={<MyTasks />} />
          <Route path="/team" element={<Team />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Page not found */}
      <Route path="*" element={<ComingSoon title="Page not found" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
