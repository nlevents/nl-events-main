import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGoogleAuth } from "../../context/AuthContext";

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" focusable="false">
      <path fill="#4285F4" d="M21.6 12.23c0-.73-.07-1.43-.2-2.1H12v3.98h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.88-1.73 2.99-4.28 2.99-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.36l-3.22-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.06v2.59A9.98 9.98 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.96A6 6 0 0 1 6.08 12c0-.68.12-1.34.31-1.96V7.45H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.55l3.33-2.59Z" />
      <path fill="#EA4335" d="M12 5.91c1.47 0 2.79.51 3.83 1.51l2.87-2.87C16.96 2.93 14.7 2 12 2a9.98 9.98 0 0 0-8.94 5.45l3.33 2.59C7.18 7.67 9.39 5.91 12 5.91Z" />
    </svg>
  );
}

export default function Login() {
  const { auth, busy, error, loginWithGoogle, setError } = useGoogleAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/account";

  useEffect(() => {
    if (auth?.ready && auth.authenticated) navigate(redirectTo, { replace: true });
  }, [auth?.ready, auth?.authenticated, navigate, redirectTo]);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthError = hash.get("error_description") || hash.get("error");
    if (oauthError) setError(decodeURIComponent(oauthError.replace(/\+/g, " ")));
  }, [setError]);

  if (!auth || !auth.ready) return null;

  return (
    <>
      <section className="page-head container">
        <p className="crumb">Account / Sign in</p>
        <span className="eyebrow">Welcome</span>
        <h1>Sign in to your account</h1>
        <p>Use your Google account to sign in securely. No SMS, password, or paid OTP service is required.</p>
      </section>

      <section className="section-tight container" style={{ maxWidth: 440 }}>
        <div className="auth-card">
          <div className="google-auth-content">
            <div className="google-auth-icon"><GoogleMark /></div>
            <h2>Continue with Google</h2>
            <p className="google-auth-copy">
              Create or access your Next Level Events account with your Google account.
            </p>

            {error && <p className="form-error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}

            <button
              type="button"
              className="btn btn-primary btn-block google-signin-btn"
              onClick={loginWithGoogle}
              disabled={busy}
            >
              <GoogleMark />
              {busy ? "Connecting to Google…" : "Continue with Google"}
            </button>

            <p className="auth-fineprint">
              By continuing you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
