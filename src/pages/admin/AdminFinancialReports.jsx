import { useEffect, useMemo, useState } from "react";
import { getInvoices } from "../../lib/adminStore";
import { fmtINR } from "../../lib/pricing";
import usePageMeta from "../../hooks/usePageMeta";
import Icon from "../../components/Icon";

function monthKey(date) { return String(date || "").slice(0, 7); }
function monthLabel(key) { if (!key) return "Unknown"; const [y,m]=key.split("-"); return new Date(Number(y), Number(m)-1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" }); }

export default function AdminFinancialReports() {
  usePageMeta("Financial Reports — Admin", "Revenue, collections and invoice reporting.", { noindex: true });
  const [period, setPeriod] = useState("12");
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("nle-admin-data-updated", refresh);
    window.addEventListener("nle-catalog-updated", refresh);
    return () => {
      window.removeEventListener("nle-admin-data-updated", refresh);
      window.removeEventListener("nle-catalog-updated", refresh);
    };
  }, []);
  const invoices = useMemo(() => getInvoices().filter((i) => i.documentType !== "quotation"), [refreshKey]);
  const rows = useMemo(() => {
    const map = new Map();
    invoices.forEach((inv) => {
      const key = monthKey(inv.issueDate || inv.createdAt);
      if (!key) return;
      const r = map.get(key) || { key, billed: 0, collected: 0, outstanding: 0, count: 0 };
      r.billed += Number(inv.total) || 0;
      r.collected += (inv.payments || []).reduce((s,p) => s + (Number(p.amount)||0), 0);
      r.outstanding += Math.max(0, (Number(inv.total)||0) - (inv.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0) - (Number(inv.writeOff?.amount)||0));
      r.count += 1; map.set(key, r);
    });
    return [...map.values()].sort((a,b)=>b.key.localeCompare(a.key)).slice(0, Number(period));
  }, [invoices, period]);
  const totals = rows.reduce((a,r)=>({ billed:a.billed+r.billed, collected:a.collected+r.collected, outstanding:a.outstanding+r.outstanding, count:a.count+r.count }), { billed:0,collected:0,outstanding:0,count:0 });
  const max = Math.max(...rows.map((r)=>r.billed), 1);
  const status = invoices.reduce((a,i)=>{ a[i.status||"draft"]=(a[i.status||"draft"]||0)+1; return a; },{});
  return <div className="admin-page financial-report-page">
    <div className="admin-page-head"><div><div className="catalog-breadcrumb">Dashboard <span>›</span> Finance <span>›</span> Financial Reports</div><h1>Financial Reports</h1><p className="admin-hint">Review billed revenue, collected payments and outstanding invoice balances.</p></div><div className="financial-report-controls"><select value={period} onChange={(e)=>setPeriod(e.target.value)}><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select><button className="btn btn-outline" onClick={()=>window.print()}><Icon name="file"/> Print Report</button></div></div>
    <div className="financial-stat-grid"><div><span><Icon name="rupee"/></span><small>Total Billed</small><strong>{fmtINR(totals.billed)}</strong></div><div><span><Icon name="check"/></span><small>Collected</small><strong>{fmtINR(totals.collected)}</strong></div><div><span><Icon name="clock"/></span><small>Outstanding</small><strong>{fmtINR(totals.outstanding)}</strong></div><div><span><Icon name="file"/></span><small>Invoices</small><strong>{totals.count}</strong></div></div>
    <div className="financial-report-grid"><section className="admin-panel"><div className="admin-panel-head"><div><h2>Revenue by Month</h2><p className="admin-hint">Based on invoice issue dates.</p></div></div><div className="financial-bars">{rows.length ? rows.slice().reverse().map((r)=><div className="financial-bar-row" key={r.key}><span>{monthLabel(r.key)}</span><div><i style={{ width: `${Math.max(3,(r.billed/max)*100)}%` }}></i></div><strong>{fmtINR(r.billed)}</strong></div>) : <div className="admin-empty">No invoice data yet.</div>}</div></section>
    <section className="admin-panel"><div className="admin-panel-head"><div><h2>Invoice Status</h2><p className="admin-hint">Current invoice records.</p></div></div><div className="financial-status-list">{Object.entries(status).length ? Object.entries(status).map(([key,count])=><div key={key}><span className={`catalog-status ${key}`}>{key.replaceAll("_"," ")}</span><strong>{count}</strong></div>) : <div className="admin-empty">No invoices yet.</div>}</div></section></div>
    <section className="admin-panel"><div className="admin-panel-head"><div><h2>Monthly Detail</h2><p className="admin-hint">Billed, collected and remaining balance for the selected period.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Month</th><th>Invoices</th><th>Billed</th><th>Collected</th><th>Outstanding</th></tr></thead><tbody>{rows.map((r)=><tr key={r.key}><td><strong>{monthLabel(r.key)}</strong></td><td>{r.count}</td><td>{fmtINR(r.billed)}</td><td>{fmtINR(r.collected)}</td><td>{fmtINR(r.outstanding)}</td></tr>)}</tbody></table></div></section>
  </div>;
}
