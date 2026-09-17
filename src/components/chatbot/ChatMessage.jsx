import Icon from "../Icon";
import ChatOption from "./ChatOption";
import ChatProductCard from "./ChatProductCard";

export default function ChatMessage({ msg, onSelect, onSend, onClose }) {
  const isBot = msg.role === "bot";
  const options = msg.options || msg.quickReplies || [];
  const isTileGrid = isBot && options.length > 0 && options.every((o) => o && o.emoji);

  return (
    <div className={"chat-row" + (isBot ? " chat-row--bot" : " chat-row--user") + " chat-row--enter"}>
      {isBot && <span className="chat-avatar chat-avatar--genie" aria-hidden="true"><span className="chat-genie-blob chat-genie-blob--xs"><span className="chat-genie-icon"><Icon name="sparkle" /></span></span></span>}
      <div className="chat-bubble-wrap">
        <div className={"chat-bubble" + (isBot ? " chat-bubble--bot" : " chat-bubble--user") + (isBot && msg.step ? " chat-bubble--question" : "")}>
          {msg.subtitle && <span className="chat-bubble-eyebrow">{msg.subtitle}</span>}
          {(msg.text || "").split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        {isBot && msg.products && msg.products.length > 0 && (
          <div className="chat-products">
            {msg.products.map((p) => (
              <ChatProductCard key={p.id} product={p} onClose={onClose} />
            ))}
          </div>
        )}

        {isBot && options.length > 0 && (
          <div className={"chat-options" + (isTileGrid ? " chat-options--grid" : "")}>
            {options.map((opt, i) => (
              <ChatOption key={i} opt={opt} onSelect={onSelect} onSend={onSend} onClose={onClose} />
            ))}
          </div>
        )}

        {isBot && msg.skip && (
          <button type="button" className="chat-skip" onClick={() => onSelect(msg.skip.action)}>
            {msg.skip.label}
          </button>
        )}
      </div>
    </div>
  );
}
