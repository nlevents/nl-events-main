import { Component } from "react";
import { isChunkLoadError, recoverFromChunkLoadError } from "../lib/lazyWithRetry";

// Keeps the last crash message (plain text, length-capped) so it can be read
// from DevTools: sessionStorage.getItem("nle-last-error"). Never rendered as HTML.
function recordError(error) {
  try {
    const text = String(error?.stack || error?.message || error).slice(0, 2000);
    sessionStorage.setItem("nle-last-error", text);
  } catch { /* storage blocked: diagnostics only */ }
}

// A crash in any single component (a bug, a bad piece of data, a browser
// quirk) should never blank the whole site. React only stops this if
// something above the failing component is a class component implementing
// componentDidCatch/getDerivedStateFromError.
//
// Used in three places:
//   1. Around the whole <App/> in main.jsx — last line of defense.
//   2. Around the routed page area (Layout.jsx / App.jsx) with `resetKey` set
//      to the current pathname. The error state is CLEARED whenever the
//      pathname changes, so one broken page can never leave the whole site
//      stuck on an error screen: the header, footer and navigation stay alive
//      and clicking any link recovers without a manual refresh.
//   3. Around <Chatbot/> with fallback={null}, so a chatbot bug only disables
//      the chatbot.
//
// `fallback` may be a node or a function ({ error, reset }) => node.
//
// Note: this component deliberately does NOT reload the page. Stale-deployment
// chunk errors are handled where they originate (src/lib/lazyWithRetry.js),
// where we can tell a real redeploy apart from a network blip.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retrying: false };
    this.reset = this.reset.bind(this);
    this.retryCount = 0;
    this.retryTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Caught by ErrorBoundary:", error, info);
    recordError(error);
    if (isChunkLoadError(error)) {
      this.setState({ retrying: true });
      recoverFromChunkLoadError().then((reloaded) => {
        if (!reloaded && this.state.hasError) this.reset();
      });
      return;
    }

    // Self-heal: the very first render of a route can hit a transient state
    // (catalog cache / cloud sync landing mid-navigation). A second render a
    // moment later succeeds, which is exactly what the manual "Try again"
    // button does. Do that automatically (a couple of times, with a short
    // back-off) so the visitor never sees the error screen for a blip. If the
    // error is real and persistent, the normal fallback is shown after the
    // retries are used up.
    const max = Number(this.props.autoRetry) || 0;
    if (this.retryCount < max) {
      const delay = [250, 700][this.retryCount] || 700;
      this.retryCount += 1;
      this.setState({ retrying: true });
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.setState({ hasError: false, error: null, retrying: false });
      }, delay);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey) {
      // New route: forget previous failures and clear any error screen.
      this.retryCount = 0;
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
      if (this.state.hasError) this.reset();
    }
  }

  componentWillUnmount() {
    clearTimeout(this.retryTimer);
  }

  reset() {
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.retryCount = 0;
    this.setState({ hasError: false, error: null, retrying: false });
  }

  render() {
    if (this.state.hasError) {
      // While an automatic retry is pending keep the space reserved and quiet
      // instead of flashing the error screen.
      if (this.state.retrying) return (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} aria-busy="true" aria-live="polite">
          <span style={{ color: "var(--text-secondary, #5b6b80)" }}>Loading…</span>
        </div>
      );
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback({ error: this.state.error, reset: this.reset });
      return fallback !== undefined ? fallback : null;
    }
    return this.props.children;
  }
}
