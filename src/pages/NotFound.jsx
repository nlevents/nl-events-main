import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";

export default function NotFound() {
  usePageMeta("Page Not Found — Next Level Events", "The page you're looking for could not be found.", { noindex: true });
  return (
    <section className="container success-wrap">
      <h1 style={{ fontSize: "clamp(26px,6vw,36px)" }}>Page Not Found</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 12 }}>The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 32 }}>Back to Home</Link>
    </section>
  );
}
