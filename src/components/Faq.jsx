import { useState } from "react";

export default function Faq({ items }) {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="faq-list reveal">
      {items.map((it, i) => (
        <div className={"faq-item" + (i === openIndex ? " open" : "")} key={i}>
          <button className="faq-q" onClick={() => setOpenIndex(i === openIndex ? -1 : i)}>{it.q}</button>
          <div className="faq-a"><p>{it.a}</p></div>
        </div>
      ))}
    </div>
  );
}
