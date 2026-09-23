import { Component } from "react";

// A crash in any single component (a bug, a bad piece of data, a browser
// quirk) should never blank the whole site. React only stops this if
// something above the failing component is a class component implementing
// componentDidCatch/getDerivedStateFromError — there wasn't one anywhere in
// this app, so this is used in two places:
//   1. Wrapping the whole <App/> in main.jsx, with a friendly full-page
//      fallback, as a last line of defense.
//   2. Wrapping just <Chatbot/> in Layout.jsx, with fallback={null}, so a bug
//      in the chatbot silently disables only the chatbot — the rest of the
//      site (header, pages, footer, WhatsApp button, cart) keeps working.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Dynamic route chunks can become stale after a deployment. When the
    // browser navigates back to a lazily loaded page, recover once instead
    // of leaving the whole site on the generic error screen.
    const message = String(error?.message || "");
    const isChunkError = /chunk|dynamically imported module|failed to fetch/i.test(message);
    if (isChunkError && typeof window !== "undefined") {
      const recoveryKey = "nle-chunk-recovery";
      if (!sessionStorage.getItem(recoveryKey)) {
        sessionStorage.setItem(recoveryKey, "1");
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(recoveryKey);
    }
    // eslint-disable-next-line no-console
    console.error("Caught by ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback !== undefined ? this.props.fallback : null;
    }
    return this.props.children;
  }
}
