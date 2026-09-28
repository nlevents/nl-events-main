import { Component } from "react";

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
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Caught by ErrorBoundary:", error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback({ error: this.state.error, reset: this.reset });
      return fallback !== undefined ? fallback : null;
    }
    return this.props.children;
  }
}
