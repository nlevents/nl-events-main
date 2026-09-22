import { useEffect, useMemo, useState } from "react";
import { getAdminResource, saveAdminResource, deleteAdminResource } from "../../lib/adminStore";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const CONFIG = {
  events: { title: "All Events", subtitle: "Manage confirmed events and their operational details.", type: "events", fields: [["name","Event Name"],["client","Client"],["eventDate","Event Date","date"],["eventType","Event Type"],["location","Location"],["status","Status"]], status: ["Planned","Confirmed","Completed","Cancelled"] },
  tasks: { title: "Tasks", subtitle: "Create, assign and track operational tasks.", type: "tasks", fields: [["title","Task"],["assignee","Assigned To"],["dueDate","Due Date","date"],["priority","Priority"],["status","Status"]], status: ["Pending","In Progress","Completed"] },
  vendors: { title: "Vendors", subtitle: "Manage decorators, artists, caterers, venues and other partners.", type: "vendors", fields: [["name","Vendor Name"],["company","Company"],["phone","Phone"],["category","Category"],["city","City"],["status","Status"]], status: ["Active","Inactive","Blacklisted"] },
  candidates: { title: "Candidates", subtitle: "Track applicants and hiring progress.", type: "candidates", fields: [["name","Candidate Name"],["phone","Phone"],["role","Role"],["experience","Experience"],["status","Status"]], status: ["New","Screening","Interview","Selected","Rejected"] },
  team: { title: "Team", subtitle: "Manage internal staff and responsibilities.", type: "team", fields: [["name","Name"],["role","Role"],["phone","Phone"],["email","Email"],["status","Status"]], status: ["Active","On Leave","Inactive"] },
  attendance: { title: "Attendance", subtitle: "Record daily staff attendance.", type: "attendance", fields: [["name","Team Member"],["date","Date","date"],["checkIn","Check In"],["checkOut","Check Out"],["status","Status"]], status: ["Present","Absent","Half Day","Leave"] },
  payroll: { title: "Salary & Payroll", subtitle: "Maintain monthly payroll records.", type: "payroll", fields: [["name","Team Member"],["month","Month"],["salary","Net Salary"],["paidDate","Paid Date","date"],["status","Status"]], status: ["Pending","Paid","On Hold"] },
  expenses: { title: "Expenses", subtitle: "Track business and event expenses.", type: "expenses", fields: [["title","Expense"],["category","Category"],["amount","Amount"],["date","Date","date"],["vendor","Vendor"],["status","Status"]], status: ["Recorded","Reimbursed","Cancelled"] },
};

export default function AdminResourcePage({ resource }) {
  const cfg = CONFIG[resource] || CONFIG.tasks;
  usePageMeta(`${cfg.title} — Admin`, cfg.subtitle);
  const [rows, setRows] = useState(() => getAdminResource(cfg.type));
  const addLabel = ({ events: "Event", tasks: "Task", vendors: "Vendor", candidates: "Candidate", team: "Team Member", attendance: "Attendance", payroll: "Payroll Record", expenses: "Expense" })[resource] || "Record";
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  const refresh = () => setRows(getAdminResource(cfg.type));
  useEffect(() => { const fn = refresh; window.addEventListener("nle-admin-resource-updated", fn); return () => window.removeEventListener("nle-admin-resource-updated", fn); }, []);

  const filtered = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const startNew = () => setEditing(Object.fromEntries(cfg.fields.map(([key]) => [key, key === "status" ? cfg.status[0] : ""])));
  const save = (e) => { e.preventDefault(); saveAdminResource(cfg.type, editing); refresh(); setEditing(null); window.dispatchEvent(new CustomEvent("nle-admin-resource-updated")); };

  return <section className="crm-page admin-resource-page">
    <div className="crm-heading-row"><div><h1>{cfg.title}</h1><p>{cfg.subtitle}</p></div><button className="crm-primary-button" onClick={startNew}>＋ Add {addLabel}</button></div>
    <div className="crm-toolbar-row"><div className="crm-search-box"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${cfg.title.toLowerCase()}...`} /></div><span className="admin-hint">{filtered.length} records</span></div>
    <div className="crm-table-card"><table className="crm-table"><thead><tr>{cfg.fields.map(([key,label]) => <th key={key}>{label}</th>)}<th>Actions</th></tr></thead><tbody>{filtered.length ? filtered.map((row) => <tr key={row.id}>{cfg.fields.map(([key]) => <td key={key}>{key === "amount" || key === "salary" ? `₹${Number(row[key] || 0).toLocaleString("en-IN")}` : row[key] || "—"}</td>)}<td><button className="btn-icon" onClick={() => setEditing({...row})} title="Edit"><Icon name="edit"/></button><button className="btn-icon btn-icon-danger" onClick={() => { if(window.confirm("Delete this record?")){ deleteAdminResource(cfg.type,row.id); refresh(); } }} title="Delete"><Icon name="trash"/></button></td></tr>) : <tr><td colSpan={cfg.fields.length+1}><div className="catalog-empty">No records yet. Add your first record.</div></td></tr>}</tbody></table></div>
    {editing && <div className="admin-modal-backdrop" onClick={() => setEditing(null)}><div className="admin-modal-card" onClick={(e)=>e.stopPropagation()}><div className="admin-modal-header"><h2>{editing.id ? `Edit ${cfg.title}` : `Add ${cfg.title}`}</h2><button className="btn-icon" onClick={()=>setEditing(null)}><Icon name="close"/></button></div><form onSubmit={save}>{cfg.fields.map(([key,label,type]) => <div className="admin-form-group" key={key}><label className="admin-form-label">{label}</label>{key === "status" ? <select className="admin-select" value={editing[key] || cfg.status[0]} onChange={(e)=>setEditing({...editing,[key]:e.target.value})}>{cfg.status.map(s=><option key={s}>{s}</option>)}</select> : <input className="admin-input" type={type || (key === "amount" || key === "salary" ? "number" : "text")} value={editing[key] || ""} onChange={(e)=>setEditing({...editing,[key]:e.target.value})} />}</div>)}<div className="admin-modal-footer"><button type="button" className="btn btn-outline" onClick={()=>setEditing(null)}>Cancel</button><button className="btn btn-primary">Save</button></div></form></div></div>}
  </section>;
}
