import Icon from "../Icon";

export default function ChatHeader({ brandName, canGoBack, onBack, onRestart, onClose, step, stepTotal }) {
  const showProgress = !!(step && stepTotal);
  return (
    <div className="chat-head">
      <div className="chat-head-row">
        {canGoBack && (
          <button type="button" className="chat-head-btn" aria-label="Go back" onClick={onBack}>
            <Icon name="arrowLeft" />
          </button>
        )}
        <span className="chat-head-avatar chat-head-avatar--genie" aria-hidden="true">
          <span className="chat-genie-blob"><span className="chat-genie-icon"><Icon name="sparkle" /></span></span>
        </span>
        <div className="chat-head-title">
          <strong>{brandName} Event Planner <span className="chat-head-sparkle">✨</span></strong>
          <span>Plan your event with us</span>
        </div>
        <button type="button" className="chat-head-btn" aria-label="Restart conversation" title="Restart" onClick={onRestart}>
          <Icon name="restart" />
        </button>
        <button type="button" className="chat-head-btn chat-head-close" aria-label="Close chat" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {showProgress && (
        <div className="chat-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={stepTotal}>
          {Array.from({ length: stepTotal }).map((_, i) => (
            <span key={i} className={"chat-progress-seg" + (i < step ? " is-filled" : "")} />
          ))}
        </div>
      )}
    </div>
  );
}
