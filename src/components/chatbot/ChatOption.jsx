import { Link } from "react-router-dom";
import { whatsappHandoffLink } from "../../lib/chatbotEngine";

// Renders one chip/button in the chatbot. Supports two option shapes so the
// guided flow (action-based) and the older freeform engine (href/whatsapp/
// message-based) can share one component and one visual style:
//   { label, action: { type, ... } }              — guided flow
//   { label, href, external? }                    — navigates
//   { label, whatsapp: "prefilled message" }       — opens WhatsApp
//   { label, message: "text to send" }             — sends as a chat message
export default function ChatOption({ opt, onSelect, onSend, onClose }) {
  if (!opt) return null;
  const tile = !!opt.emoji;
  const inner = (
    <>
      {tile && <span className="chat-opt-emoji" aria-hidden="true">{opt.emoji}</span>}
      <span className="chat-opt-label">{opt.label}</span>
    </>
  );

  if (opt.href) {
    return (
      <Link to={opt.href} className={"chat-opt" + (tile ? " chat-opt--tile" : "")} onClick={onClose} target={opt.external ? "_blank" : undefined} rel={opt.external ? "noopener noreferrer" : undefined}>
        {inner}
      </Link>
    );
  }
  if (opt.whatsapp) {
    return (
      <a className="chat-opt chat-opt--wa" href={whatsappHandoffLink(opt.whatsapp)} target="_blank" rel="noopener noreferrer" onClick={onClose}>
        {inner}
      </a>
    );
  }
  if (opt.action) {
    const { action } = opt;
    if (action.type === "link") {
      return (
        <Link to={action.href} className={"chat-opt" + (tile ? " chat-opt--tile" : "")} onClick={onClose} target={action.external ? "_blank" : undefined} rel={action.external ? "noopener noreferrer" : undefined}>
          {inner}
        </Link>
      );
    }
    if (action.type === "whatsapp") {
      return (
        <a className="chat-opt chat-opt--wa" href={whatsappHandoffLink(action.message)} target="_blank" rel="noopener noreferrer" onClick={onClose}>
          {inner}
        </a>
      );
    }
    return (
      <button type="button" className={"chat-opt" + (tile ? " chat-opt--tile" : "")} onClick={() => onSelect(action)}>
        {inner}
      </button>
    );
  }
  if (opt.message) {
    return (
      <button type="button" className={"chat-opt" + (tile ? " chat-opt--tile" : "")} onClick={() => onSend(opt.message)}>
        {inner}
      </button>
    );
  }
  return null;
}
