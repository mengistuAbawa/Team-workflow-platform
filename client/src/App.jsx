import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

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

// Temporary page for features that are not implemented yet.
function ComingSoon({ title }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>

      <p className="mt-2 text-sm text-slate-500">
        This page will be connected to the database in the next
        implementation step.
      </p>
    </section>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Default route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Projects */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<CreateProject />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />

          {/* Tasks belonging to a specific project */}
          <Route
            path="/projects/:projectId/tasks"
            element={<ProjectTasks />}
          />

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
      <Route
        path="*"
        element={<ComingSoon title="Page not found" />}
      />
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