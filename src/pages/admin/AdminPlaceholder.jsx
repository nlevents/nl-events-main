import "../../styles/admin.css";

export default function AdminPlaceholder({ title }) {
  return (
    <section className="crm-page" style={{ paddingTop: 24 }}>
      <div className="crm-heading-row">
        <div><h1>{title}</h1><p>This admin section is ready for configuration.</p></div>
      </div>
      <div className="crm-table-card" style={{ padding: 28, color: "#617086" }}>
        <strong>{title}</strong>
        <div style={{ marginTop: 8 }}>The navigation is connected and the section can be implemented here without changing the sidebar.</div>
      </div>
    </section>
  );
}
