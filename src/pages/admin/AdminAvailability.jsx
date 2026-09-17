import { useState, useEffect } from "react";
import { getBlackoutDates, toggleBlackoutDate, getCities, saveCity, toggleCityActive } from "../../lib/catalogStore";
import usePageMeta from "../../hooks/usePageMeta";
import Icon from "../../components/Icon";

export default function AdminAvailability() {
  usePageMeta("Availability & Calendar — Admin", "Manage blackout dates and city service availability.");

  const [blackoutDates, setBlackoutDates] = useState(getBlackoutDates);
  const [cities, setCities] = useState(getCities);
  const [editingMultiplier, setEditingMultiplier] = useState(null); // city name currently being edited
  const [multiplierDraft, setMultiplierDraft] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [noteInput, setNoteInput] = useState("Fully Booked");
  const [feedback, setFeedback] = useState("");

  function refresh() {
    setBlackoutDates(getBlackoutDates());
    setCities(getCities());
  }

  function handleToggleCity(name) {
    toggleCityActive(name);
    refresh();
  }

  function handleStartEditMultiplier(city) {
    setEditingMultiplier(city.name);
    setMultiplierDraft(String(city.multiplier ?? 1));
  }

  function handleSaveMultiplier(city) {
    saveCity({ ...city, multiplier: Number(multiplierDraft) || 1 });
    setEditingMultiplier(null);
    refresh();
  }

  useEffect(() => {
    function onUpdate() {
      refresh();
    }
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  function handleDateClick(dateStr) {
    toggleBlackoutDate(dateStr, noteInput);
    refresh();
    setFeedback(`Toggled status for ${dateStr}.`);
    setTimeout(() => setFeedback(""), 2500);
  }

  // Generate calendar days for selected month
  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push(dayStr);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Availability & Calendar Controls</h1>
          <p className="admin-hint">
            Block out fully booked dates, holiday rushes, or off-season dates to prevent customer bookings.
          </p>
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}

      <div className="admin-availability-layout">
        {/* Calendar Picker Panel */}
        <div className="admin-panel admin-calendar-panel">
          <div className="admin-panel-head">
            <h2>Blackout Calendar</h2>
            <div className="admin-month-selector">
              <input
                type="month"
                className="admin-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-form-group" style={{ marginBottom: "16px" }}>
            <label className="admin-form-label">Note for Blacked Out Dates</label>
            <input
              type="text"
              className="admin-input"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. Fully Booked / Maintenance"
            />
          </div>

          <div className="admin-calendar-grid">
            <div className="admin-cal-day-name">Sun</div>
            <div className="admin-cal-day-name">Mon</div>
            <div className="admin-cal-day-name">Tue</div>
            <div className="admin-cal-day-name">Wed</div>
            <div className="admin-cal-day-name">Thu</div>
            <div className="admin-cal-day-name">Fri</div>
            <div className="admin-cal-day-name">Sat</div>

            {calendarCells.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="admin-cal-cell empty" />;
              }
              const isBlocked = blackoutDates.some((b) => b.date === dateStr);
              const blockedInfo = blackoutDates.find((b) => b.date === dateStr);
              const dayNum = Number(dateStr.slice(-2));

              return (
                <div
                  key={dateStr}
                  className={`admin-cal-cell ${isBlocked ? "blocked" : "available"}`}
                  onClick={() => handleDateClick(dateStr)}
                  title={isBlocked ? `${blockedInfo?.note || "Blocked"} (Click to unlock)` : "Available (Click to block)"}
                >
                  <span className="admin-cal-date-num">{dayNum}</span>
                  {isBlocked && <span className="admin-cal-badge">{blockedInfo?.note || "Blocked"}</span>}
                </div>
              );
            })}
          </div>

          <div className="admin-cal-legend">
            <span className="legend-item">
              <span className="legend-box available" /> Available for Booking
            </span>
            <span className="legend-item">
              <span className="legend-box blocked" /> Blocked / Blackout Date
            </span>
          </div>
        </div>

        {/* City Coverage Matrix Panel */}
        <div className="admin-panel admin-cities-panel">
          <h2>Service City Coverage ({cities.length})</h2>
          <p className="admin-hint">
            Toggle a city on/off to control whether customers can select it, and adjust its travel/logistics
            price multiplier.
          </p>
          <table className="admin-table admin-table-sm">
            <thead>
              <tr>
                <th>City</th>
                <th>Multiplier</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => (
                <tr key={c.name}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>
                    {editingMultiplier === c.name ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0.5"
                          max="5"
                          className="admin-input admin-num-input"
                          style={{ width: "80px" }}
                          value={multiplierDraft}
                          onChange={(e) => setMultiplierDraft(e.target.value)}
                          autoFocus
                        />
                        <button type="button" className="btn-icon" title="Save" onClick={() => handleSaveMultiplier(c)}>
                          <Icon name="check" />
                        </button>
                      </div>
                    ) : (
                      <span onClick={() => handleStartEditMultiplier(c)} style={{ cursor: "pointer" }} title="Click to edit">
                        {(c.multiplier || 1).toFixed(2)}x
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`admin-badge ${c.active !== false ? "admin-badge--paid" : "admin-badge--cancelled"}`}
                      onClick={() => handleToggleCity(c.name)}
                      title="Click to toggle status"
                      style={{ cursor: "pointer", border: "none" }}
                    >
                      {c.active !== false ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="admin-row-actions" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit multiplier"
                        onClick={() => handleStartEditMultiplier(c)}
                      >
                        <Icon name="edit" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "24px" }}>
            <h2>Blocked Dates List ({blackoutDates.length})</h2>
            {blackoutDates.length === 0 ? (
              <p className="admin-empty">No dates currently blocked.</p>
            ) : (
              <div className="admin-tags-list" style={{ marginTop: "8px" }}>
                {blackoutDates.map((b) => (
                  <span key={b.date} className="admin-tag-item admin-tag-danger">
                    {b.date} ({b.note})
                    <button type="button" onClick={() => handleDateClick(b.date)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
