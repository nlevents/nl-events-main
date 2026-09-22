import { useMemo } from "react";
import { getStats, getInvoices } from "../../lib/adminStore";
import usePageMeta from "../../hooks/usePageMeta";

export default function AdminFinancialReports(){
  usePageMeta("Financial Reports — Admin","Revenue, collections and outstanding balances.");
  const stats = getStats();
  const invoices = getInvoices().filter(i=>i.documentType!=="quotation");
  const totalBilled = useMemo(()=>invoices.reduce((s,i)=>s+Number(i.total||0),0),[invoices]);
  const totalPaid = stats.totalRevenue;
  const outstanding = Math.max(0,totalBilled-totalPaid);
  return <section className="crm-page admin-resource-page"><div className="crm-heading-row"><div><h1>Financial Reports</h1><p>Track billed value, collections and outstanding balances.</p></div></div><div className="catalog-stats"><div><strong>₹{totalBilled.toLocaleString("en-IN")}</strong><small>Total Billed</small></div><div><strong>₹{totalPaid.toLocaleString("en-IN")}</strong><small>Total Collected</small></div><div><strong>₹{outstanding.toLocaleString("en-IN")}</strong><small>Outstanding</small></div><div><strong>{invoices.length}</strong><small>Invoices</small></div></div><div className="crm-table-card"><h2 style={{padding:"20px 20px 0"}}>Recent Invoices</h2><table className="crm-table"><thead><tr><th>Invoice</th><th>Client</th><th>Event Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{invoices.length?invoices.map(i=>{const paid=(i.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);return <tr key={i.id}><td>{i.number}</td><td>{i.clientName||i.customerName||"—"}</td><td>{i.eventDate||"—"}</td><td>₹{Number(i.total||0).toLocaleString("en-IN")}</td><td>₹{paid.toLocaleString("en-IN")}</td><td>₹{Math.max(0,Number(i.total||0)-paid).toLocaleString("en-IN")}</td><td>{i.status||"—"}</td></tr>}):<tr><td colSpan="7"><div className="catalog-empty">No invoices available for reporting.</div></td></tr>}</tbody></table></div></section>
}
