import "../../styles/admin.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import usePageMeta from "../../hooks/usePageMeta";

export default function AdminLogin() {
  usePageMeta("Admin — Next Level Events", "Admin panel.", { noindex: true });
  const auth = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!auth || !auth.ready) return null;

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await auth.login(email, password);
    setBusy(false);
    if (!result?.ok) setError(result?.error || "Invalid admin credentials or this account is not authorized.");
    else navigate("/admin", { replace: true });
  }

  return (
    <div className="admin-auth-screen">
      <form className="admin-auth-card" onSubmit={handleLogin}>
        <span className="eyebrow">Admin</span>
        <h1>Log in</h1>
        <div className="form-group">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" type="email" autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="admin-pw">Password</label>
          <input id="admin-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? "Signing in…" : "Log in"}</button>
      </form>
    </div>
  );
}
