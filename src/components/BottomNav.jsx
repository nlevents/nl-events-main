import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { BOTTOM_LINKS } from "../data/nav";
import { waLink } from "../data/images";
import { useChatbot } from "../context/ChatbotContext";

export default function BottomNav() {
  const location = useLocation();
  const chat = useChatbot();
  return (
    <nav className="bottom-nav" aria-label="Bottom">
      {BOTTOM_LINKS.map((l) => {
        const isWa = l.href === "__whatsapp__";
        const isChatbot = l.action === "chatbot";
        const href = isWa ? waLink() : l.href;
        const active = isChatbot ? !!chat?.open : !l.external && href === location.pathname;
        const className = "bottom-nav-link" + (active ? " active" : "") + (l.fab ? " is-fab" : "");
        const inner = (
          <>
            <span className={"bn-icon" + (isChatbot ? " bn-icon--genie" : "")}>
              {isChatbot ? (
                <span className="chat-genie-blob chat-genie-blob--sm"><span className="chat-genie-icon"><Icon name="sparkle" /></span></span>
              ) : (
                <Icon name={l.icon} />
              )}
            </span>
            <span className="bn-label">{l.label}</span>
          </>
        );
        if (isChatbot) {
          return (
            <button key={l.label} type="button" className={className} onClick={() => chat?.openChat()}>
              {inner}
            </button>
          );
        }
        if (l.external) {
          return (
            <a key={l.label} href={href} className={className} target="_blank" rel="noopener noreferrer">
              {inner}
            </a>
          );
        }
        return (
          <Link key={l.label} to={href} className={className}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
