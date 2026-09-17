import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  // Don't redirect before the initial session check resolves — otherwise a
  // logged-in user gets briefly bounced to /login on every full page load.
  if (!auth || !auth.ready) return null;

  if (!auth.authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
