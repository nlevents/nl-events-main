import { useEffect, useState } from "react";
import usePageMeta from "../../hooks/usePageMeta";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function AccountDetails() {
  usePageMeta("Account Details — Next Level Events", "Manage your basic account details.", { noindex: true });
  const auth = useAuth();
  const showToast = useToast();
  const user = auth?.user;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  if (!user) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await auth.updateProfile({ name, email });
      showToast?.("Account details updated.");
    } catch (err) {
      setErrors({ form: err.message || "Couldn't save your details. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="account-panel-title">Account Details</h2>
      <p className="account-panel-sub">Basic details our team uses to reach you about your bookings.</p>

      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 440 }}>
        <div className="form-group">
          <label htmlFor="acc-name">Full name</label>
          <input id="acc-name" type="text" maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="acc-email">Email</label>
          <input id="acc-email" type="email" maxLength={120} autoComplete="email" style={errors.email ? { borderColor: "#d16a5a" } : undefined} value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="form-error">{errors.email}</p>
        </div>
        <div className="form-group">
          <label>Phone number</label>
          <input type="tel" value={user.phone} disabled />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Your phone number is used for booking and contact purposes. Authentication is handled through your Google account.
          </p>
        </div>

        {errors.form && <p className="form-error">{errors.form}</p>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
