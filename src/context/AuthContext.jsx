import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authApi from "../lib/authApi";

const AuthContext = createContext(null);

// Only the token + email are persisted client-side; the rest of the user
// object is re-fetched from fetchProfile() on load so a stale/tampered
// localStorage value can never silently grant stale account data.
const SESSION_KEY = "nle-auth-session";

function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeSession(session) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode — session just won't persist across reloads */
  }
}

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Restore a previous session, or consume the Supabase OAuth tokens returned
  // in the URL fragment after Google redirects back to /login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const oauthError = hash.get("error_description") || hash.get("error");
        if (oauthError) throw new Error(decodeURIComponent(oauthError.replace(/\+/g, " ")));
        const oauthToken = hash.get("access_token");
        const oauthRefresh = hash.get("refresh_token");
        if (oauthToken) {
          const result = await authApi.completeOAuthSession(oauthToken, oauthRefresh);
          if (cancelled) return;
          setUser(result.user);
          setToken(result.token);
          setRefreshToken(result.refreshToken || null);
          writeSession({ token: result.token, refreshToken: result.refreshToken || null, email: result.user.email || "" });
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          return;
        }

        const session = readSession();
        if (!session || !session.token || !session.email) return;
        let accessToken = session.token;
        let nextRefresh = session.refreshToken;
        let profile;
        try {
          profile = await authApi.fetchProfile(accessToken);
        } catch {
          if (!nextRefresh) throw new Error("Session expired.");
          const refreshed = await authApi.refreshSession(nextRefresh);
          accessToken = refreshed.token;
          nextRefresh = refreshed.refreshToken;
          profile = await authApi.fetchProfile(accessToken);
        }
        if (cancelled) return;
        setUser(profile);
        setToken(accessToken);
        setRefreshToken(nextRefresh || null);
        writeSession({ token: accessToken, refreshToken: nextRefresh || null, email: profile.email || "" });
      } catch (err) {
        if (!cancelled && err?.message) {
          console.error("Google authentication:", err.message);
          writeSession(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const completeLogin = useCallback((nextUser, nextToken, nextRefreshToken) => {
    setUser(nextUser);
    setToken(nextToken);
    setRefreshToken(nextRefreshToken || null);
    writeSession({ token: nextToken, refreshToken: nextRefreshToken || null, email: nextUser.email || "" });
  }, []);

  // Refresh the Supabase access token before its normal one-hour expiry.
  useEffect(() => {
    if (!token || !refreshToken) return undefined;
    const id = window.setInterval(async () => {
      try {
        const refreshed = await authApi.refreshSession(refreshToken);
        setToken(refreshed.token);
        setRefreshToken(refreshed.refreshToken || refreshToken);
        writeSession({ token: refreshed.token, refreshToken: refreshed.refreshToken || refreshToken, email: user?.email || "" });
      } catch {
        // The next protected request will force a clean re-login if refresh fails.
      }
    }, 45 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [token, refreshToken, user?.phone]);

  const logout = useCallback(async () => {
    try {
      await authApi.logoutRequest(token);
    } catch {
      /* best-effort server-side invalidation; clear the local session regardless */
    }
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    writeSession(null);
  }, [token]);

  const updateProfile = useCallback(
    async (patch) => {
      if (!user) throw new Error("Not logged in.");
      const updated = await authApi.updateProfile(token, user.email, patch);
      setUser(updated);
      return updated;
    },
    [user, token]
  );

  const getBookings = useCallback(async () => {
    if (!user) return [];
    return authApi.fetchBookings(token);
  }, [user, token]);

  return (
    <AuthContext.Provider
      value={{
        ready,
        user,
        token,
        authenticated: !!user,
        completeLogin,
        logout,
        updateProfile,
        getBookings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ----------------------------------------------------------------------------
// Google-only customer authentication flow.
// ----------------------------------------------------------------------------
export function useGoogleAuth() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loginWithGoogle = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/login`;
      await authApi.loginWithGoogle(redirectTo);
    } catch (err) {
      setBusy(false);
      setError(err.message || "Unable to start Google sign-in.");
      return false;
    }
    return true;
  }, []);

  return { auth, busy, error, loginWithGoogle, setError };
}
