import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getBotReply } from "../lib/chatbotEngine";
import {
  occasionGreeting,
  whomScreen,
  styleScreen,
  recommendationScreen,
  browseScreen,
  otherEventScreen,
} from "../lib/chatbotFlowEngine";
import { OTHER_EVENT_VALUE } from "../data/chatbotFlow";
import { BRAND_NAME } from "../data/chatbotKnowledge";
import { useCity } from "./CityContext";

const ChatbotContext = createContext(null);
let idCounter = 0;
function nextId() {
  return ++idCounter;
}

const START_SCREEN = { type: "start" };

function renderScreen(screen, city) {
  switch (screen.type) {
    case "whom":
      return whomScreen(screen.occasionSlug);
    case "style":
      return styleScreen(screen.occasionSlug, screen.whomPhrase);
    case "recommend":
      return recommendationScreen({
        occasionSlug: screen.occasionSlug,
        whomPhrase: screen.whomPhrase,
        styleKey: screen.styleKey,
        styleLabel: screen.styleLabel,
        city,
      });
    case "browse":
      return browseScreen(screen.trail, city);
    case "other":
      return otherEventScreen();
    case "start":
    default:
      return occasionGreeting();
  }
}

function screenToBotMessage(screen, city) {
  const rendered = renderScreen(screen, city);
  return {
    id: nextId(),
    role: "bot",
    text: rendered.text,
    subtitle: rendered.subtitle || null,
    options: rendered.options || [],
    products: rendered.products || [],
    skip: rendered.skip || null,
    step: rendered.step || null,
    stepTotal: rendered.stepTotal || null,
  };
}

export function ChatbotProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [screenStack, setScreenStack] = useState([START_SCREEN]);
  const typingTimer = useRef(null);
  const cityCtx = useCity(); // ChatbotProvider sits inside CityProvider in App.jsx
  const city = cityCtx ? cityCtx.city : "Ranchi";

  // Lazily build the welcome message once (avoids recomputing on every render).
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([screenToBotMessage(START_SCREEN, city)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const toggleChat = useCallback(() => setOpen((o) => !o), []);

  const pushBotMessage = useCallback((msg, delay) => {
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setMessages((prev) => [...prev, msg]);
      setTyping(false);
    }, delay ?? 420);
  }, []);

  // Advances the guided flow to a new screen: records a user bubble (if a
  // label is given), pushes the screen onto the back-navigation stack, then
  // shows the bot's next question/recommendation after a short "typing" beat.
  const goToScreen = useCallback((screen, userLabel) => {
    setMessages((prev) => (userLabel ? [...prev, { id: nextId(), role: "user", text: userLabel }] : prev));
    setScreenStack((prev) => [...prev, screen]);
    const botMsg = screenToBotMessage(screen, city);
    pushBotMessage(botMsg, 380 + Math.random() * 260);
  }, [city, pushBotMessage]);

  const restartChat = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setTyping(false);
    setScreenStack([START_SCREEN]);
    setMessages([screenToBotMessage(START_SCREEN, city)]);
  }, [city]);

  const goBack = useCallback(() => {
    setScreenStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const top = next[next.length - 1];
      pushBotMessage(screenToBotMessage(top, city), 300);
      return next;
    });
  }, [city, pushBotMessage]);

  const resumeGuided = useCallback(() => {
    setScreenStack((prev) => {
      const top = prev[prev.length - 1] || START_SCREEN;
      pushBotMessage(screenToBotMessage(top, city), 300);
      return prev;
    });
  }, [city, pushBotMessage]);

  // Handles a tap on a structured (guided-flow) quick-reply option. `link`
  // and `whatsapp` actions are rendered as real <a>/<Link> elements by the
  // UI, not routed through here.
  const selectOption = useCallback((action) => {
    if (!action) return;
    switch (action.type) {
      case "occasion": {
        if (action.value === OTHER_EVENT_VALUE) {
          goToScreen({ type: "other" }, "Other Event");
        } else {
          goToScreen({ type: "whom", occasionSlug: action.value }, action.label);
        }
        return;
      }
      case "whom": {
        const current = screenStack[screenStack.length - 1];
        const occasionSlug = current && current.occasionSlug;
        goToScreen(
          { type: "style", occasionSlug, whomValue: action.value, whomPhrase: action.phrase },
          action.label || "Skip this"
        );
        return;
      }
      case "style": {
        const current = screenStack[screenStack.length - 1];
        goToScreen(
          {
            type: "recommend",
            occasionSlug: current && current.occasionSlug,
            whomValue: current && current.whomValue,
            whomPhrase: current && current.whomPhrase,
            styleKey: action.value,
            styleLabel: action.label,
          },
          action.label || "Surprise me"
        );
        return;
      }
      case "style-again": {
        goToScreen({ type: "style", occasionSlug: action.occasionSlug }, "Try a different style");
        return;
      }
      case "browse": {
        goToScreen({ type: "browse", trail: action.trail }, action.label);
        return;
      }
      case "back":
        goBack();
        return;
      case "resume":
        resumeGuided();
        return;
      case "restart":
        restartChat();
        return;
      default:
        return;
    }
  }, [screenStack, goToScreen, goBack, resumeGuided, restartChat]);

  // Free-text input: try to match the currently visible guided options first
  // (so typing "wedding" still advances the flow), then fall back to the
  // rule-based freeform engine for pricing/contact/booking-style questions.
  const sendMessage = useCallback((rawText) => {
    const text = (rawText || "").trim().slice(0, 500);
    if (!text) return;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);

    const lastBot = [...messages].reverse().find((m) => m.role === "bot");
    const lower = text.toLowerCase();
    const matchedOption = lastBot && (lastBot.options || []).find((o) => o.label && lower.includes(o.label.toLowerCase().replace(/^[^\w]+/, "").trim()));

    if (matchedOption && matchedOption.action && !["link", "whatsapp"].includes(matchedOption.action.type)) {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        setTyping(false);
        selectOption(matchedOption.action);
      }, 420);
      return;
    }

    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      const reply = getBotReply(text, city);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "bot",
          text: reply.text,
          quickReplies: [...(reply.quickReplies || []), { label: "Back to guided suggestions", action: { type: "resume" } }],
        },
      ]);
      setTyping(false);
    }, 450 + Math.min(text.length * 8, 700));
  }, [messages, city, selectOption]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  const canGoBack = screenStack.length > 1;
  const lastBotMsg = [...messages].reverse().find((m) => m.role === "bot");
  const step = lastBotMsg ? lastBotMsg.step : null;
  const stepTotal = lastBotMsg ? lastBotMsg.stepTotal : null;

  const value = useMemo(() => ({
    open, openChat, closeChat, toggleChat,
    messages, typing, sendMessage, selectOption,
    restartChat, goBack, canGoBack, step, stepTotal,
    brandName: BRAND_NAME,
  }), [open, openChat, closeChat, toggleChat, messages, typing, sendMessage, selectOption, restartChat, goBack, canGoBack, step, stepTotal]);

  return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>;
}

export function useChatbot() {
  return useContext(ChatbotContext);
}
