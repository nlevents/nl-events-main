import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import ChatHeader from "./chatbot/ChatHeader";
import ChatMessage from "./chatbot/ChatMessage";
import ChatLauncher from "./chatbot/ChatLauncher";
import TypingIndicator from "./chatbot/TypingIndicator";
import { useChatbot } from "../context/ChatbotContext";

export default function Chatbot() {
  const chat = useChatbot();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = chat?.open ? "hidden" : "";
  }, [chat?.open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.messages, chat?.typing, chat?.open]);

  if (!chat) return null;
  const { open, closeChat, openChat, messages, typing, sendMessage, selectOption, restartChat, goBack, canGoBack, brandName, step, stepTotal } = chat;

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput("");
  }

  return (
    <>
      <ChatLauncher onOpen={() => (open ? closeChat() : openChat())} open={open} />

      <div className={"chat-backdrop" + (open ? " is-open" : "")} onClick={(e) => { if (e.target === e.currentTarget) closeChat(); }}>
        <div className="chat-panel" role="dialog" aria-modal="true" aria-label={brandName + " event planner"}>
          <ChatHeader
            brandName={brandName}
            canGoBack={canGoBack}
            onBack={goBack}
            onRestart={restartChat}
            onClose={closeChat}
            step={step}
            stepTotal={stepTotal}
          />

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m) => (
              <ChatMessage key={m.id} msg={m} onSelect={selectOption} onSend={sendMessage} onClose={closeChat} />
            ))}
            {typing && <TypingIndicator />}
          </div>

          <form className="chat-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              className="chat-input"
              placeholder="Or type your own question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
              aria-label="Type your message"
            />
            <button type="submit" className="chat-send-btn" aria-label="Send message" disabled={!input.trim()}>
              <Icon name="send" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
