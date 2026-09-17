import { useEffect, useRef } from "react";

// Controlled, accessible OTP box group. `value` is always the single source
// of truth (a string of digits) — this component never keeps its own copy
// of the code, so there's no drift between what's shown and what gets
// submitted.
export default function OtpInput({ length = 6, value, onChange, onComplete, disabled }) {
  const refs = useRef([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function setDigitAt(index, char) {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").replace(/\s+/g, "").slice(0, length));
  }

  function handleChange(index, e) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setDigitAt(index, "");
      return;
    }
    // Handles both a single keystroke and a full paste landing in one box.
    const chars = raw.split("");
    const next = digits.slice();
    let cursor = index;
    for (const ch of chars) {
      if (cursor >= length) break;
      next[cursor] = ch;
      cursor += 1;
    }
    onChange(next.join("").slice(0, length));
    const focusIndex = Math.min(cursor, length - 1);
    refs.current[focusIndex]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="otp-input-group" role="group" aria-label="Enter verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={length}
          className="otp-box"
          value={digit}
          disabled={disabled}
          aria-label={"Digit " + (i + 1)}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
