import Icon from "../Icon";

// Desktop floating launcher — the bottom nav (which hosts the event planning button
// on mobile/tablet) is hidden on wide screens, so this keeps the assistant
// reachable there. Colorful gradient "genie" avatar with a subtle animated
// shimmer + orbiting sparkle, so it reads as alive without being a distracting
// bounce/sound loop.
export default function ChatLauncher({ onOpen, open }) {
  return (
    <button
      type="button"
      className={"chat-launcher" + (open ? " is-active" : "")}
      aria-label="Open event planner"
      onClick={onOpen}
    >
      <span className="chat-launcher-ring" aria-hidden="true" />
      <span className="chat-launcher-icon chat-launcher-icon--genie" aria-hidden="true">
        <span className="chat-genie-blob"><span className="chat-genie-icon"><Icon name="sparkle" /></span></span>
      </span>
      <span className="chat-launcher-sparkle" aria-hidden="true"><Icon name="sparkle" /></span>
    </button>
  );
}
