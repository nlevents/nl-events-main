import { Navigate, useLocation } from "react-router-dom";

export default function Services() {
  const location = useLocation();
  return <Navigate to={`/occasion/event-services${location.search}`} replace />;
}
