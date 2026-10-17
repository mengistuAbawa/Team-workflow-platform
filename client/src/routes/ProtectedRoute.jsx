import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/common/Loader";

export function getRoleDashboardPath(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "manager") return "/manager/dashboard";
  return "/dashboard";
}

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <Loader label="Restoring your session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user's role is not authorized for this route, redirect to their role's dashboard
    const redirectPath = getRoleDashboardPath(user.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
