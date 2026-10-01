import { useMemo, useState } from "react";

function flattenChildren(nodes = [], trail = []) {
  const out = [];
  (nodes || []).forEach((node) => {
    const next = [...trail, node];
    out.push({ node, trail: next });
    out.push(...flattenChildren(node.children || [], next));
  });
  return out;
}

function checkboxMark(state) {
  if (state === "partial") return "−";
  return state === "checked" ? "✓" : "";
}

export default function ServiceContextPicker({ occasions = [], value = [], onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState({});
  const selected = Array.isArray(value) ? value : [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const availableOccasions = useMemo(
    () => occasions.filter((occasion) => !occasion?.addonOnly),
    [occasions]
  );

  const allOptions = useMemo(() => {
    const options = [];
    availableOccasions.forEach((occasion) => {
      const rootPath = occasion.slug;
      options.push({ path: rootPath, label: occasion.label, occasionSlug: occasion.slug, depth: 0 });
      flattenChildren(occasion.children || []).forEach(({ node, trail }) => {
        options.push({
          path: [occasion.slug, ...trail.map((item) => item.slug)].join("/"),
          label: trail.map((item) => item.label).join(" › "),
          occasionSlug: occasion.slug,
          depth: trail.length,
        });
      });
    });
    return options;
  }, [availableOccasions]);

  const optionsByOccasion = useMemo(() => {
    const map = new Map();
    allOptions.forEach((option) => {
      if (!map.has(option.occasionSlug)) map.set(option.occasionSlug, []);
      map.get(option.occasionSlug).push(option);
    });
    return map;
  }, [allOptions]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOccasions = availableOccasions.map((occasion) => {
    const descendants = optionsByOccasion.get(occasion.slug) || [];
    const visible = !normalizedQuery
      ? descendants
      : descendants.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
    return { occasion, options: visible };
  }).filter(({ options }) => options.length);

  const getDescendantPaths = (occasion) =>
    (optionsByOccasion.get(occasion.slug) || []).map((option) => option.path);

  function emit(next) {
    onChange(Array.from(new Set(next)));
  }

  function toggleOccasion(occasion) {
    const paths = getDescendantPaths(occasion);
    const root = occasion.slug;
    const currentlyAll = selectedSet.has(root) || paths.every((path) => selectedSet.has(path));

    if (currentlyAll) {
      emit(selected.filter((path) => !paths.includes(path)));
      return;
    }

    // The root occasion is a compact scope that means "all functions under it".
    // Keeping it as the only stored value also makes Select All predictable.
    emit([...selected.filter((path) => !paths.includes(path)), root]);
  }

  function toggleChild(path, occasion) {
    const root = occasion.slug;
    const paths = getDescendantPaths(occasion);
    const childPaths = paths.filter((candidate) => candidate !== root);
    let next = [...selected];

    // If the whole occasion is selected, expand it to its individual functions
    // first, then toggle the clicked function off. This makes the UI behave
    // exactly like a normal checklist instead of hiding state behind the parent.
    if (selectedSet.has(root)) {
      next = next.filter((candidate) => candidate !== root);
      next.push(...childPaths);
      next = next.filter((candidate) => candidate !== path);
    } else if (selectedSet.has(path)) {
      next = next.filter((candidate) => candidate !== path);
    } else {
      next.push(path);
    }

    const unique = Array.from(new Set(next));
    const allChildrenSelected = childPaths.length > 0 && childPaths.every((candidate) => unique.includes(candidate));
    if (allChildrenSelected) {
      emit([...unique.filter((candidate) => !childPaths.includes(candidate)), root]);
    } else {
      emit(unique);
    }
  }

  function getOccasionState(occasion) {
    const paths = getDescendantPaths(occasion);
    const rootSelected = selectedSet.has(occasion.slug);
    const childPaths = paths.filter((path) => path !== occasion.slug);
    if (rootSelected || (childPaths.length > 0 && childPaths.every((path) => selectedSet.has(path)))) return "checked";
    if (childPaths.some((path) => selectedSet.has(path))) return "partial";
    return "unchecked";
  }

  function getSelectionSummary() {
    let occasionsCount = 0;
    let functionsCount = 0;
    availableOccasions.forEach((occasion) => {
      const state = getOccasionState(occasion);
      if (state === "checked" && selectedSet.has(occasion.slug)) occasionsCount += 1;
      else if (state === "checked") functionsCount += 1;
      else if (state === "partial") {
        const childPaths = getDescendantPaths(occasion).filter((path) => path !== occasion.slug);
        functionsCount += childPaths.filter((path) => selectedSet.has(path)).length;
      }
    });
    return { occasionsCount, functionsCount };
  }

  function selectAll() {
    emit(availableOccasions.map((occasion) => occasion.slug));
  }

  function clearAll() {
    emit([]);
  }

  const summary = getSelectionSummary();
  const summaryText = summary.occasionsCount || summary.functionsCount
    ? [
        summary.occasionsCount ? `${summary.occasionsCount} ${summary.occasionsCount === 1 ? "occasion" : "occasions"}` : "",
        summary.functionsCount ? `${summary.functionsCount} ${summary.functionsCount === 1 ? "function" : "functions"}` : "",
      ].filter(Boolean).join(" · ")
    : "Nothing selected";

  return (
    <div className="service-context-picker">
      <div className="service-context-picker__summary">
        <div>
          <strong>{summaryText}</strong>
          <span>Choose a whole occasion for all its functions, or open it and pick only the functions you need.</span>
        </div>
        <div className="service-context-picker__actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={selectAll}>Select all occasions</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={clearAll}>Clear</button>
        </div>
      </div>

      <div className="service-context-picker__search">
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search an occasion or function…" />
      </div>

      <div className="service-context-picker__groups">
        {visibleOccasions.map(({ occasion, options }) => {
          const state = getOccasionState(occasion);
          const expanded = normalizedQuery || open[occasion.slug];
          const childOptions = options.filter((option) => option.path !== occasion.slug);
          const selectedChildren = childOptions.filter((option) => selectedSet.has(option.path)).length;
          const allChildren = (optionsByOccasion.get(occasion.slug) || []).filter((option) => option.path !== occasion.slug).length;
          const detail = state === "checked" && selectedSet.has(occasion.slug)
            ? "All functions"
            : `${selectedChildren} of ${allChildren} functions`;

          return (
            <div className={`service-context-group${state !== "unchecked" ? " selected" : ""}`} key={occasion.slug}>
              <div className="service-context-group__head">
                <button
                  type="button"
                  className={`service-context-check service-context-check--occasion${state !== "unchecked" ? " selected" : ""}`}
                  role="checkbox"
                  aria-checked={state === "partial" ? "mixed" : state === "checked"}
                  onClick={() => toggleOccasion(occasion)}
                >
                  <span className={`service-context-check__box ${state === "partial" ? "partial" : ""}`}>{checkboxMark(state)}</span>
                  <span><strong>{occasion.label}</strong><small>{detail}</small></span>
                </button>
                <button
                  type="button"
                  className="service-context-group__toggle"
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${occasion.label}`}
                  aria-expanded={Boolean(expanded)}
                  onClick={() => setOpen((current) => ({ ...current, [occasion.slug]: !expanded }))}
                >{expanded ? "−" : "+"}</button>
              </div>

              {expanded && (
                <div className="service-context-group__children">
                  {childOptions.length ? childOptions.map((option) => {
                    const checked = selectedSet.has(option.path) || selectedSet.has(occasion.slug);
                    const inherited = selectedSet.has(occasion.slug);
                    return (
                      <button
                        type="button"
                        className={`service-context-check service-context-check--child depth-${Math.min(option.depth, 4)}${checked ? " selected" : ""}`}
                        role="checkbox"
                        aria-checked={checked}
                        key={option.path}
                        onClick={() => toggleChild(option.path, occasion)}
                      >
                        <span className="service-context-check__box">{checked ? "✓" : ""}</span>
                        <span>{option.label}</span>
                        {inherited && <small className="service-context-inherited">Included</small>}
                      </button>
                    );
                  }) : <div className="service-context-picker__empty">No functions have been added to this occasion yet.</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!visibleOccasions.length && <div className="service-context-picker__empty">No matching occasion or function found.</div>}
    </div>
  );
}
