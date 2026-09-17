export default function TypingIndicator() {
  return (
    <div className="chat-row chat-row--bot">
      <span className="chat-avatar chat-avatar--genie" aria-hidden="true"><span className="chat-genie-blob chat-genie-blob--xs"><span className="chat-genie-emoji chat-genie-emoji--xs">✨</span></span></span>
      <div className="chat-bubble chat-bubble--bot chat-typing">
        <span></span><span></span><span></span>
      </div>
    </div>
  );
}
