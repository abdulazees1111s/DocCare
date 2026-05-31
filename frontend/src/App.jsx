import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  FileCheck2,
  LogOut,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserRound
} from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, assetUrl } from "./api";

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function formatDate(value) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function uniqueSlots(slots) {
  const seen = new Set();
  return slots
    .filter((slot) => {
      const key = `${slot.doctor || ""}-${new Date(slot.startsAt).getTime()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

function toDateTimeLocal(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function ActionText({ message, tone = "info" }) {
  if (!message) return null;
  return <p className={`action-text ${tone}`}>{message}</p>;
}

function Shell({ children }) {
  const { user, logout, settings } = useAuth();
  const nav = [
    { id: "home", label: "Dashboard", icon: CalendarDays },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings, adminOnly: true }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          {settings?.logoUrl ? <img src={assetUrl(settings.logoUrl)} alt="" /> : <ShieldCheck size={28} />}
          <strong>{settings?.appName || "DocCare"}</strong>
        </div>
        <div className="profile-chip">
          <UserRound size={18} />
          <div>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
        </div>
        <nav>
          {nav
            .filter((item) => !item.adminOnly || user.role === "admin")
            .map((item) => (
              <a href={`#${item.id}`} key={item.id}>
                <item.icon size={17} />
                {item.label}
              </a>
            ))}
        </nav>
        <button className="ghost full" onClick={logout}>
          <LogOut size={17} />
          Logout
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function AuthPage({ sessionMessage = "" }) {
  const { login, registerUser, registerDoctor } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      if (mode === "login") await login(Object.fromEntries(form));
      if (mode === "user") await registerUser(Object.fromEntries(form));
      if (mode === "doctor") await registerDoctor(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <div>
          <Badge tone="blue">Doctor Appointment System</Badge>
          <h1>Book, manage, and complete appointments from one clean workspace.</h1>
        </div>
        <div className="tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "user" ? "active" : ""} onClick={() => setMode("user")}>User</button>
          <button className={mode === "doctor" ? "active" : ""} onClick={() => setMode("doctor")}>Doctor</button>
        </div>
        <form onSubmit={submit} className="form">
          {sessionMessage && <p className="action-text info">{sessionMessage}</p>}
          {mode !== "login" && <input name="name" placeholder="Full name" required />}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          {mode !== "login" && <input name="phone" placeholder="Phone" />}
          {mode === "doctor" && (
            <>
              <input name="specialization" placeholder="Specialization" required />
              <input name="qualification" placeholder="Qualification" required />
              <input name="experienceYears" type="number" min="0" placeholder="Experience years" />
              <input name="consultationFee" type="number" min="0" placeholder="Consultation fee" required />
              <label className="file-field">
                Certificate
                <input name="certificate" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required />
              </label>
            </>
          )}
          {error && <p className="error">{error}</p>}
          <button disabled={loading}>{loading ? "Please wait..." : "Continue"}</button>
        </form>
        <p className="hint">Admin demo: admin@docapp.com / Admin@123</p>
      </section>
    </div>
  );
}

function UserDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [message, setMessage] = useState("");
  const [actionStatus, setActionStatus] = useState("");

  async function load() {
    const [doctorData, appointmentData, prescriptionData] = await Promise.all([
      api("/api/doctors"),
      api("/api/appointments/my"),
      api("/api/prescriptions/my")
    ]);
    setDoctors(doctorData);
    setAppointments(appointmentData);
    setPrescriptions(prescriptionData);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

  async function openDoctor(id) {
    setSelected(await api(`/api/doctors/${id}`));
  }

  async function book(slotId) {
    setActionStatus("Booking appointment...");
    try {
      await api("/api/appointments/book", { method: "POST", body: JSON.stringify({ slotId }) });
      setActionStatus("Done: appointment booked.");
      setMessage("Appointment booked successfully.");
      setSelected(null);
      load();
    } catch (err) {
      setActionStatus(`Failed: ${err.message}`);
    }
  }

  async function action(id, type) {
    setActionStatus(`${type} in progress...`);
    try {
      await api(`/api/appointments/${id}/${type}`, { method: "PATCH" });
      setActionStatus(`Done: ${type} completed.`);
      setMessage(`${type} request completed.`);
      load();
    } catch (err) {
      setActionStatus(`Failed: ${err.message}`);
    }
  }

  return (
    <>
      <Header title="Find a doctor" subtitle="Approved doctors and live appointment slots." />
      {message && <div className="notice">{message}</div>}
      <ActionText message={actionStatus} tone={actionStatus.startsWith("Failed") ? "error" : "success"} />
      <section className="grid cards">
        {doctors.map((doc) => (
          <article className="card" key={doc._id}>
            <Stethoscope />
            <h3>{doc.user.name}</h3>
            <p>{doc.specialization} · {doc.qualification}</p>
            <p>Fee: ₹{doc.consultationFee}</p>
            <button onClick={() => openDoctor(doc.user._id)}>View slots</button>
          </article>
        ))}
      </section>
      {selected && (
        <section className="panel">
          <h2>{selected.doctor.user.name}</h2>
          <p>{selected.doctor.bio || selected.doctor.specialization}</p>
          <div className="slot-list">
            {selected.slots.map((slot) => (
              <button key={slot._id} className="slot" onClick={() => book(slot._id)}>
                <Clock size={16} />
                {formatDate(slot.startsAt)}
              </button>
            ))}
            {!selected.slots.length && (
              <p className="empty-state">No available future slots. Add a future slot from the doctor dashboard after admin approval.</p>
            )}
          </div>
        </section>
      )}
      <Appointments title="My appointments" appointments={appointments} onAction={action} userView />
      <PrescriptionList prescriptions={prescriptions} />
      <Notifications />
    </>
  );
}

function DoctorDashboard() {
  const { refreshMe, profile } = useAuth();
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState("");

  async function load() {
    const [slotData, appointmentData] = await Promise.all([
      api("/api/doctors/me/slots"),
      api("/api/doctors/me/appointments")
    ]);
    setSlots(uniqueSlots(slotData));
    setAppointments(appointmentData);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

  async function createSlot(e) {
    e.preventDefault();
    setMessage("");
    setFormStatus("Adding slot...");
    try {
      const form = e.currentTarget;
      const slot = await api("/api/doctors/me/slots", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      setSlots((current) => uniqueSlots([...current, slot]));
      form.reset();
      setMessage("Slot added successfully.");
      setFormStatus("Done: slot added.");
    } catch (err) {
      setMessage(err.message);
      setFormStatus(`Failed: ${err.message}`);
    }
  }

  async function addPrescription(e) {
    e.preventDefault();
    setFormStatus("Saving prescription...");
    try {
      const form = e.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      data.medicines = [{ name: data.medicine, dosage: data.dosage, duration: data.duration }];
      await api("/api/prescriptions", { method: "POST", body: JSON.stringify(data) });
      form.reset();
      setFormStatus("Done: prescription sent to patient.");
      load();
    } catch (err) {
      setFormStatus(`Failed: ${err.message}`);
    }
  }

  async function appointmentAction(id, type) {
    const suffix = type === "complete" ? "complete" : "reschedule/confirm";
    setFormStatus(`${type} in progress...`);
    try {
      await api(`/api/appointments/${id}/${suffix}`, { method: "PATCH" });
      setFormStatus(`Done: ${type} completed.`);
      load();
    } catch (err) {
      setFormStatus(`Failed: ${err.message}`);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    setFormStatus("Saving profile...");
    try {
      await api("/api/doctors/me/profile", { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) });
      await refreshMe();
      setMessage("Profile updated.");
      setFormStatus("Done: profile saved.");
    } catch (err) {
      setFormStatus(`Failed: ${err.message}`);
    }
  }

  return (
    <>
      <Header title="Doctor dashboard" subtitle="Manage availability, appointments, and prescriptions." />
      {profile?.approvalStatus !== "approved" && (
        <div className="notice warn">Approval status: {profile?.approvalStatus}. Admin approval is required before creating slots.</div>
      )}
      {message && <div className="notice">{message}</div>}
      <ActionText message={formStatus} tone={formStatus.startsWith("Failed") ? "error" : "success"} />
      <section className="two-col">
        <form className="panel form compact-form" onSubmit={createSlot}>
          <h2>Create slot</h2>
          <label className="field-label">
            Slot time
            <input name="startsAt" type="datetime-local" min={toDateTimeLocal()} defaultValue={toDateTimeLocal()} required />
          </label>
          <ActionText message={formStatus} tone={formStatus.startsWith("Failed") ? "error" : "success"} />
          <button>Add slot</button>
        </form>
        <form className="panel form" onSubmit={updateProfile}>
          <h2>Profile</h2>
          <input name="specialization" defaultValue={profile?.specialization} placeholder="Specialization" />
          <input name="qualification" defaultValue={profile?.qualification} placeholder="Qualification" />
          <input name="consultationFee" type="number" defaultValue={profile?.consultationFee} placeholder="Fee" />
          <textarea name="bio" defaultValue={profile?.bio} placeholder="Bio" />
          <ActionText message={formStatus} tone={formStatus.startsWith("Failed") ? "error" : "success"} />
          <button>Save profile</button>
        </form>
      </section>
      <section className="panel">
        <h2>Slots</h2>
        <div className="slot-list">{slots.map((slot) => <Badge key={slot._id}>{formatDate(slot.startsAt)} · {slot.status}</Badge>)}</div>
      </section>
      <Appointments title="Patient appointments" appointments={appointments} onAction={appointmentAction} doctorView />
      <form className="panel form" onSubmit={addPrescription}>
        <h2>Add prescription</h2>
        <select name="appointmentId" required>
          <option value="">Select appointment</option>
          {appointments.map((a) => (
            <option key={a._id} value={a._id}>
              {(a.user?.name || "Patient")} - {formatDate(a.startsAt)} - {a.status}
            </option>
          ))}
        </select>
        <input name="diagnosis" placeholder="Diagnosis" required />
        <input name="medicine" placeholder="Medicine" />
        <input name="dosage" placeholder="Dosage" />
        <input name="duration" placeholder="Duration" />
        <textarea name="advice" placeholder="Advice" />
        <ActionText message={formStatus} tone={formStatus.startsWith("Failed") ? "error" : "success"} />
        <button><ClipboardPlus size={17} /> Save prescription</button>
      </form>
      <Notifications />
    </>
  );
}

function AdminDashboard() {
  const { refreshSettings } = useAuth();
  const [stats, setStats] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [actionStatus, setActionStatus] = useState("");

  async function load() {
    const [s, d, u, a] = await Promise.all([
      api("/api/admin/dashboard"),
      api("/api/admin/doctors"),
      api("/api/admin/users"),
      api("/api/admin/appointments")
    ]);
    setStats(s);
    setDoctors(d);
    setUsers(u);
    setAppointments(a);
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id, status) {
    setActionStatus(`${status} in progress...`);
    try {
      await api(`/api/admin/doctors/${id}/review`, { method: "PATCH", body: JSON.stringify({ status }) });
      setActionStatus(`Done: doctor ${status}.`);
      load();
    } catch (err) {
      setActionStatus(`Failed: ${err.message}`);
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    setActionStatus("Saving settings...");
    try {
      await api("/api/settings", { method: "PUT", body: new FormData(e.currentTarget) });
      await refreshSettings();
      setActionStatus("Done: settings saved.");
    } catch (err) {
      setActionStatus(`Failed: ${err.message}`);
    }
  }

  return (
    <>
      <Header title="Admin dashboard" subtitle="Approvals, monitoring, commission, and branding." />
      <ActionText message={actionStatus} tone={actionStatus.startsWith("Failed") ? "error" : "success"} />
      <section className="metric-grid">
        {Object.entries(stats).map(([key, value]) => <div className="metric" key={key}><strong>{value}</strong><span>{key}</span></div>)}
      </section>
      <section className="panel">
        <h2>Doctor approvals</h2>
        <Table rows={doctors} columns={["Doctor", "Specialization", "Fee", "Certificate", "Status", "Actions"]} render={(doc) => [
          doc.user?.name,
          doc.specialization,
          `₹${doc.consultationFee}`,
          <a href={assetUrl(doc.certificateUrl)} target="_blank">View</a>,
          <Badge tone={doc.approvalStatus === "approved" ? "green" : doc.approvalStatus === "rejected" ? "red" : "yellow"}>{doc.approvalStatus}</Badge>,
          <div className="row-actions"><button onClick={() => review(doc._id, "approved")}>Approve</button><button className="ghost" onClick={() => review(doc._id, "rejected")}>Reject</button></div>
        ]} />
      </section>
      <section className="two-col">
        <section className="panel">
          <h2>Users</h2>
          <Table rows={users} columns={["Name", "Email", "Phone"]} render={(u) => [u.name, u.email, u.phone || "-"]} />
        </section>
        <form className="panel form" id="settings" onSubmit={saveSettings}>
          <h2>Settings</h2>
          <input name="appName" placeholder="App name" />
          <select name="commissionType"><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select>
          <input name="commissionValue" type="number" min="0" placeholder="Commission value" />
          <label className="file-field">Logo<input name="logo" type="file" accept=".jpg,.jpeg,.png,.webp" /></label>
          <ActionText message={actionStatus} tone={actionStatus.startsWith("Failed") ? "error" : "success"} />
          <button><Settings size={17} /> Save settings</button>
        </form>
      </section>
      <Appointments title="All appointments" appointments={appointments} />
    </>
  );
}

function Header({ title, subtitle }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div></header>;
}

function Table({ rows, columns, render }) {
  return (
    <div className="table-wrap"><table><thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row._id}>{render(row).map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>
  );
}

function Appointments({ title, appointments, onAction, userView, doctorView }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <Table rows={appointments} columns={["Patient", "Doctor", "Date", "Fee", "Status", "Prescription", "Actions"]} render={(a) => [
        a.user?.name || "-",
        a.doctor?.name || "-",
        formatDate(a.startsAt),
        `₹${a.totalFee || 0}`,
        <Badge tone={a.status === "completed" ? "green" : "blue"}>{a.status}</Badge>,
        a.prescription ? (
          <div className="prescription-chip">
            <strong>{a.prescription.diagnosis}</strong>
            <span>{a.prescription.advice || "Prescription attached"}</span>
          </div>
        ) : (
          <Badge>No prescription</Badge>
        ),
        <div className="row-actions">
          {userView && a.status === "booked" && <><button className="ghost" onClick={() => onAction(a._id, "reschedule")}>Reschedule</button><button className="ghost" onClick={() => onAction(a._id, "cancel")}>Cancel</button></>}
          {doctorView && <><button onClick={() => onAction(a._id, "complete")}><CheckCircle2 size={15} /> Complete</button>{a.status === "reschedule_requested" && <button className="ghost" onClick={() => onAction(a._id, "confirm")}>Confirm move</button>}</>}
        </div>
      ]} />
    </section>
  );
}

function PrescriptionList({ prescriptions }) {
  return (
    <section className="panel">
      <h2>Prescriptions</h2>
      <div className="grid cards">
        {prescriptions.map((p) => (
          <article className="card" key={p._id}>
            <FileCheck2 />
            <h3>{p.diagnosis}</h3>
            <p>{p.advice || "No advice added"}</p>
            <small>{p.medicines?.map((m) => `${m.name} ${m.dosage}`).join(", ")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function Notifications() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");

  async function loadNotifications() {
    try {
      setStatus("Refreshing notifications...");
      const data = await api("/api/notifications");
      setItems(data);
      setStatus("Done: notifications updated.");
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
    }
  }

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(() => {
      loadNotifications();
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="panel" id="notifications">
      <div className="section-title">
        <h2>Notifications</h2>
        <ActionText message={status} tone={status.startsWith("Failed") ? "error" : "success"} />
        <button className="ghost compact" onClick={loadNotifications}>Refresh</button>
      </div>
      <div className="stack">
        {items.map((n) => (
          <div className="notification" key={n._id}>
            <Bell size={16} />
            <div>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
            </div>
          </div>
        ))}
        {!items.length && <p className="empty-state">No notifications yet.</p>}
      </div>
    </section>
  );
}

function Router() {
  const { user, authReady, sessionMessage } = useAuth();
  if (!authReady) return <div className="loading-screen">Checking session...</div>;
  if (!user) return <AuthPage sessionMessage={sessionMessage} />;
  return (
    <Shell>
      {user.role === "user" && <UserDashboard />}
      {user.role === "doctor" && <DoctorDashboard />}
      {user.role === "admin" && <AdminDashboard />}
    </Shell>
  );
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");

  function clearSession(message = "") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setProfile(null);
    setSessionMessage(message);
  }

  async function saveSession(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    setSessionMessage("");
    await refreshMe();
  }

  async function refreshMe() {
    if (!localStorage.getItem("token")) {
      clearSession();
      return;
    }
    try {
      const data = await api("/api/auth/me");
      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (err) {
      clearSession("Session expired. Please login again.");
      throw err;
    }
  }

  async function refreshSettings() {
    setSettings(await api("/api/settings"));
  }

  useEffect(() => {
    refreshSettings();
    refreshMe()
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    settings,
    authReady,
    sessionMessage,
    refreshMe,
    refreshSettings,
    login: (body) => api("/api/auth/login", { method: "POST", body: JSON.stringify(body) }).then(saveSession),
    registerUser: (body) => api("/api/auth/register/user", { method: "POST", body: JSON.stringify(body) }).then(saveSession),
    registerDoctor: (body) => api("/api/auth/register/doctor", { method: "POST", body }).then(saveSession),
    logout: () => {
      clearSession();
    }
  }), [user, profile, settings, authReady, sessionMessage]);

  return <AuthContext.Provider value={value}><Router /></AuthContext.Provider>;
}
