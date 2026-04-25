import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://rrcfxtcbnuiwzdqzocow.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyY2Z4dGNibnVpd3pkcXpvY293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMDgxODAsImV4cCI6MjA5MjY4NDE4MH0.kSIoYjgElcQf6l8j6f7gzsBMk1LEXzvKP0UNyMoQcFI";

// ── Supabase client ───────────────────────────────────────────────────────────
function sb(table) {
  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  const h = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  return {
    async select(q = "*") {
      const r = await fetch(`${base}?select=${q}&order=created_at.desc`, { headers: h });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async insert(body) {
      const r = await fetch(base, { method: "POST", headers: h, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async update(id, body) {
      const r = await fetch(`${base}?id=eq.${id}`, { method: "PATCH", headers: h, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async delete(id) {
      const r = await fetch(`${base}?id=eq.${id}`, { method: "DELETE", headers: h });
      if (!r.ok) throw new Error(await r.text());
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("fr-TN");
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR") : "";
const fmtDateLong = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "";

const STATUS_MAP = { attente: { label: "En attente", color: "#F59E0B" }, cours: { label: "En cours", color: "#0EA5E9" }, termine: { label: "Terminé", color: "#10B981" }, livre: { label: "Livré", color: "#A78BFA" } };
const TYPE_MAP = { diagnostic: "Diagnostic", vidange: "Vidange", reparation: "Réparation", lavage: "Lavage", pieces: "Pièces" };
const RDV_MAP = { confirme: { label: "Confirmé", color: "#10B981" }, attente: { label: "En attente", color: "#F59E0B" }, annule: { label: "Annulé", color: "#EF4444" }, converti: { label: "Converti", color: "#A78BFA" } };
const HEURES = ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00"];

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></>,
    users:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    car:       <><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h10l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></>,
    wrench:    <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>,
    wallet:    <><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></>,
    refresh:   <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit:      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:     <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    close:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check:     <><polyline points="20 6 9 17 4 12"/></>,
    alert:     <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    chevronR:  <><polyline points="9 18 15 12 9 6"/></>,
    chevronL:  <><polyline points="15 18 9 12 15 6"/></>,
    search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    convert:   <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    activity:  <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    trendUp:   <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// ── useDB hook ────────────────────────────────────────────────────────────────
function useDB() {
  const [db, setDb] = useState({ clients: [], vehicules: [], interventions: [], caisse: [], rendez_vous: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setSyncing(true); else setLoading(true);
    try {
      const [clients, vehicules, interventions, caisse, rendez_vous] = await Promise.all([
        sb("clients").select("*"), sb("vehicules").select("*"),
        sb("interventions").select("*"), sb("caisse").select("*"), sb("rendez_vous").select("*"),
      ]);
      setDb({ clients, vehicules, interventions, caisse, rendez_vous });
    } catch { showToast("Erreur connexion Supabase", "error"); }
    finally { setLoading(false); setSyncing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addClient = async (f) => { const [r] = await sb("clients").insert({ nom: f.nom, telephone: f.telephone, credit: Number(f.credit) || 0, notes: f.notes }); setDb(d => ({ ...d, clients: [r, ...d.clients] })); showToast("Client ajouté"); };
  const updateClient = async (id, f) => { const [r] = await sb("clients").update(id, { nom: f.nom, telephone: f.telephone, credit: Number(f.credit) || 0, notes: f.notes }); setDb(d => ({ ...d, clients: d.clients.map(c => c.id === id ? r : c) })); showToast("Client mis à jour"); };
  const deleteClient = async (id) => { await sb("clients").delete(id); setDb(d => ({ ...d, clients: d.clients.filter(c => c.id !== id) })); showToast("Supprimé"); };

  const addVehicule = async (f) => { const [r] = await sb("vehicules").insert({ client_id: f.clientId || null, immat: f.immat, marque: f.marque, modele: f.modele, annee: f.annee, couleur: f.couleur, km: Number(f.km) || null, status: f.status, notes: f.notes }); setDb(d => ({ ...d, vehicules: [r, ...d.vehicules] })); showToast("Véhicule ajouté"); };
  const updateVehicule = async (id, f) => { const [r] = await sb("vehicules").update(id, { client_id: f.clientId || null, immat: f.immat, marque: f.marque, modele: f.modele, annee: f.annee, couleur: f.couleur, km: Number(f.km) || null, status: f.status, notes: f.notes }); setDb(d => ({ ...d, vehicules: d.vehicules.map(v => v.id === id ? r : v) })); showToast("Mis à jour"); };
  const updateVehiculeStatus = async (id, status) => { const [r] = await sb("vehicules").update(id, { status }); setDb(d => ({ ...d, vehicules: d.vehicules.map(v => v.id === id ? r : v) })); showToast("Statut mis à jour"); };
  const deleteVehicule = async (id) => { await sb("vehicules").delete(id); setDb(d => ({ ...d, vehicules: d.vehicules.filter(v => v.id !== id) })); showToast("Supprimé"); };

  const addIntervention = async (f) => { const [r] = await sb("interventions").insert({ vehicle_id: f.vehicleId || null, type: f.type, date: f.date, description: f.description, prix_estime: Number(f.prixEstime) || null, prix_reel: Number(f.prixReel) || null, pieces: f.pieces, statut: f.statut, notes: f.notes }); setDb(d => ({ ...d, interventions: [r, ...d.interventions] })); showToast("Intervention ajoutée"); return r; };
  const updateIntervention = async (id, f) => { const [r] = await sb("interventions").update(id, { vehicle_id: f.vehicleId || null, type: f.type, date: f.date, description: f.description, prix_estime: Number(f.prixEstime) || null, prix_reel: Number(f.prixReel) || null, pieces: f.pieces, statut: f.statut, notes: f.notes }); setDb(d => ({ ...d, interventions: d.interventions.map(i => i.id === id ? r : i) })); showToast("Mis à jour"); };
  const deleteIntervention = async (id) => { await sb("interventions").delete(id); setDb(d => ({ ...d, interventions: d.interventions.filter(i => i.id !== id) })); showToast("Supprimé"); };

  const addCaisse = async (f) => { const [r] = await sb("caisse").insert({ type: f.type, montant: Number(f.montant), description: f.description, date: f.date, client_id: f.clientId || null, category: f.category }); setDb(d => ({ ...d, caisse: [r, ...d.caisse] })); showToast("Opération enregistrée"); };
  const deleteCaisse = async (id) => { await sb("caisse").delete(id); setDb(d => ({ ...d, caisse: d.caisse.filter(c => c.id !== id) })); showToast("Supprimé"); };

  const addRdv = async (f) => { const [r] = await sb("rendez_vous").insert({ client_id: f.clientId || null, vehicle_id: f.vehicleId || null, date: f.date, heure: f.heure, type: f.type, description: f.description, statut: f.statut || "confirme", notes: f.notes }); setDb(d => ({ ...d, rendez_vous: [r, ...d.rendez_vous] })); showToast("RDV ajouté"); };
  const updateRdv = async (id, f) => { const [r] = await sb("rendez_vous").update(id, { client_id: f.clientId || null, vehicle_id: f.vehicleId || null, date: f.date, heure: f.heure, type: f.type, description: f.description, statut: f.statut, notes: f.notes }); setDb(d => ({ ...d, rendez_vous: d.rendez_vous.map(x => x.id === id ? r : x) })); showToast("RDV mis à jour"); };
  const deleteRdv = async (id) => { await sb("rendez_vous").delete(id); setDb(d => ({ ...d, rendez_vous: d.rendez_vous.filter(x => x.id !== id) })); showToast("RDV supprimé"); };
  const convertirRdv = async (rdv) => { const i = await addIntervention({ vehicleId: rdv.vehicle_id, type: rdv.type, date: rdv.date, description: rdv.description || "", prixEstime: "", prixReel: "", pieces: "", statut: "cours", notes: `RDV ${rdv.heure}` }); const [r] = await sb("rendez_vous").update(rdv.id, { statut: "converti", intervention_id: i.id }); setDb(d => ({ ...d, rendez_vous: d.rendez_vous.map(x => x.id === rdv.id ? r : x) })); showToast("RDV converti en intervention"); };

  return { db, loading, syncing, toast, refresh: () => load(true), addClient, updateClient, deleteClient, addVehicule, updateVehicule, updateVehiculeStatus, deleteVehicule, addIntervention, updateIntervention, deleteIntervention, addCaisse, deleteCaisse, addRdv, updateRdv, deleteRdv, convertirRdv };
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg0: "#05070F", bg1: "#080B14", bg2: "#0C1020", bg3: "#111827",
  glass: "rgba(255,255,255,0.03)", glassBorder: "rgba(255,255,255,0.07)",
  blue: "#0EA5E9", blueDim: "rgba(14,165,233,0.15)", blueBright: "#38BDF8",
  red: "#EF4444", redDim: "rgba(239,68,68,0.12)",
  green: "#10B981", greenDim: "rgba(16,185,129,0.12)",
  gold: "#F59E0B", goldDim: "rgba(245,158,11,0.12)",
  purple: "#A78BFA",
  text0: "#F1F5F9", text1: "#94A3B8", text2: "#475569",
  border: "rgba(255,255,255,0.07)",
};

// ── Global styles ─────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg0}; color: ${T.text0}; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
  input, select, textarea { font-family: 'DM Sans', sans-serif; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
  select option { background: #111827; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes glow { 0%,100% { box-shadow: 0 0 8px rgba(14,165,233,0.3); } 50% { box-shadow: 0 0 20px rgba(14,165,233,0.6); } }
  .fade-up { animation: fadeUp 0.3s ease forwards; }
  .slide-in { animation: slideIn 0.25s ease forwards; }
  .btn-hover:hover { opacity: 0.85; transform: translateY(-1px); }
  .btn-hover { transition: all 0.15s ease; }
  .row-hover:hover { background: rgba(14,165,233,0.04) !important; border-left: 2px solid ${T.blue} !important; }
  .row-hover { transition: all 0.15s; border-left: 2px solid transparent !important; }
  .card-hover:hover { border-color: rgba(14,165,233,0.25) !important; transform: translateY(-2px); }
  .card-hover { transition: all 0.2s ease; }
  .nav-item:hover { background: rgba(14,165,233,0.08) !important; color: ${T.text0} !important; }
  .nav-item { transition: all 0.15s ease; }
  .input-field:focus { border-color: ${T.blue} !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.1) !important; outline: none; }
`;

// ── Reusable UI ───────────────────────────────────────────────────────────────
function GlassCard({ children, style, className = "" }) {
  return (
    <div className={`card-hover ${className}`} style={{
      background: T.glass, border: `1px solid ${T.glassBorder}`,
      borderRadius: 16, backdropFilter: "blur(12px)", ...style
    }}>{children}</div>
  );
}

function StatusDot({ color, pulse = false }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "block", animation: pulse ? "pulse 2s infinite" : "none" }} />
      {pulse && <span style={{ position: "absolute", inset: -2, borderRadius: "50%", border: `1px solid ${color}`, opacity: 0.4, animation: "pulse 2s infinite" }} />}
    </span>
  );
}

function StatusBadge({ value, map }) {
  const s = map[value] || { label: value, color: T.text1 };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: `${s.color}18`, border: `1px solid ${s.color}40`,
      color: s.color, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600
    }}>
      <StatusDot color={s.color} pulse={value === "cours"} />
      {s.label}
    </span>
  );
}

function KPICard({ label, value, sub, color, icon, delay = 0 }) {
  return (
    <GlassCard style={{ padding: "22px 24px", animation: `fadeUp 0.4s ease ${delay}s both` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18} color={color} />
        </div>
        <Icon name="trendUp" size={14} color={T.text2} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: T.text0, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.text1, marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: color, marginTop: 2 }}>{sub}</div>}
    </GlassCard>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", icon, disabled, style }) {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${T.blue}, ${T.blueBright})`, color: "#fff", border: "none", boxShadow: `0 4px 14px rgba(14,165,233,0.3)` },
    ghost:   { background: T.glass, color: T.text1, border: `1px solid ${T.border}` },
    danger:  { background: T.redDim, color: T.red, border: `1px solid rgba(239,68,68,0.3)` },
    success: { background: T.greenDim, color: T.green, border: `1px solid rgba(16,185,129,0.3)` },
    outline: { background: "transparent", color: T.blue, border: `1px solid ${T.blue}40` },
  };
  return (
    <button className="btn-hover" onClick={disabled ? undefined : onClick} style={{
      ...styles[variant],
      padding: size === "sm" ? "6px 12px" : "9px 18px",
      fontSize: size === "sm" ? 12 : 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
      borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", ...style
    }}>
      {icon && <Icon name={icon} size={14} color="currentColor" />}
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, options }) {
  const base = {
    width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.04)",
    border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13,
    color: T.text0, fontFamily: "'DM Sans', sans-serif", outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>}
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} className="input-field" style={{ ...base, cursor: "pointer" }}>
            <option value="">— Sélectionner —</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field" style={base} />}
    </div>
  );
}

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div className="fade-up" style={{ background: "#0C1020", border: `1px solid ${T.glassBorder}`, borderRadius: 18, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, background: "#0C1020" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: T.text0 }}>{title}</h2>
          <button onClick={onClose} className="btn-hover" style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.text1 }}>
            <Icon name="close" size={14} color="currentColor" />
          </button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormGrid({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>;
}

function FormRow({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</div>;
}

function FormActions({ onSave, onCancel, saving }) {
  return (
    <div style={{ display: "flex", gap: 10, paddingTop: 8, borderTop: `1px solid ${T.border}`, marginTop: 8 }}>
      <Btn onClick={onSave} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Btn>
      <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: T.text2 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: T.glass, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <Icon name={icon} size={22} color={T.text2} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{text}</div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const color = toast.type === "error" ? T.red : T.green;
  return (
    <div className="slide-in" style={{ position: "fixed", bottom: 24, right: 24, background: "#0C1020", border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`, color: T.text0, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 10 }}>
      <Icon name={toast.type === "error" ? "alert" : "check"} size={14} color={color} />
      {toast.msg}
    </div>
  );
}

function Spinner({ color = T.blue }) {
  return <span style={{ width: 14, height: 14, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />;
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: T.text0 }}>{title}</h2>
      {action}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <Icon name="search" size={14} color={T.text2} />
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Rechercher..."} className="input-field"
        style={{ width: "100%", padding: "9px 12px 9px 36px", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text0, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ db, setTab }) {
  const todayStr = today();
  const enCours = db.vehicules.filter(v => v.status === "cours");
  const enAttente = db.vehicules.filter(v => v.status === "attente");
  const encaisse = db.caisse.filter(c => c.date === todayStr && c.type === "entree").reduce((s, c) => s + Number(c.montant), 0);
  const sorties = db.caisse.filter(c => c.date === todayStr && c.type === "sortie").reduce((s, c) => s + Number(c.montant), 0);
  const creditsTotal = db.clients.reduce((s, c) => s + Number(c.credit || 0), 0);
  const rdvAuj = db.rendez_vous.filter(r => r.date === todayStr && r.statut !== "annule").sort((a, b) => a.heure.localeCompare(b.heure));
  const recentInt = [...db.interventions].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);
  const clientsCredit = db.clients.filter(c => Number(c.credit) > 0).sort((a, b) => Number(b.credit) - Number(a.credit));

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: T.blue, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: T.text0, letterSpacing: -0.5 }}>
          Tableau de bord
        </h1>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <KPICard label="Véhicules en atelier" value={enCours.length + enAttente.length} sub={`${enCours.length} en cours · ${enAttente.length} en attente`} color={T.blue} icon="car" delay={0} />
        <KPICard label="Encaissé aujourd'hui" value={`${fmt(encaisse)} TND`} sub={`Sorties: ${fmt(sorties)} TND`} color={T.green} icon="wallet" delay={0.05} />
        <KPICard label="Crédits en attente" value={`${fmt(creditsTotal)} TND`} sub={`${clientsCredit.length} client(s)`} color={T.red} icon="alert" delay={0.1} />
        <KPICard label="RDV aujourd'hui" value={rdvAuj.length} sub="rendez-vous planifiés" color={T.gold} icon="calendar" delay={0.15} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Atelier live */}
        <GlassCard style={{ padding: "20px 0" }}>
          <div style={{ padding: "0 22px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: "'Syne', sans-serif" }}>Activité atelier</div>
            <StatusDot color={T.green} pulse />
          </div>
          {[...enCours, ...enAttente].length === 0
            ? <Empty icon="car" text="Aucun véhicule en atelier" />
            : [...enCours, ...enAttente].slice(0, 7).map((v, i) => {
              const client = db.clients.find(c => c.id === v.client_id);
              const s = STATUS_MAP[v.status] || {};
              return (
                <div key={v.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: i < 6 ? `1px solid ${T.border}` : "none" }}>
                  <StatusDot color={s.color || T.text2} pulse={v.status === "cours"} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, letterSpacing: 0.3 }}>{v.immat}</div>
                    <div style={{ fontSize: 11, color: T.text1 }}>{v.marque} {v.modele} · {client?.nom || "—"}</div>
                  </div>
                  <StatusBadge value={v.status} map={STATUS_MAP} />
                </div>
              );
            })}
        </GlassCard>

        {/* RDV du jour */}
        <GlassCard style={{ padding: "20px 0" }}>
          <div style={{ padding: "0 22px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: "'Syne', sans-serif" }}>Planning du jour</div>
            <button onClick={() => setTab("agenda")} className="btn-hover" style={{ fontSize: 11, color: T.blue, background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              Agenda <Icon name="chevronR" size={12} color={T.blue} />
            </button>
          </div>
          {rdvAuj.length === 0
            ? <Empty icon="calendar" text="Aucun rendez-vous aujourd'hui" />
            : rdvAuj.map((r, i) => {
              const c = db.clients.find(x => x.id === r.client_id);
              const v = db.vehicules.find(x => x.id === r.vehicle_id);
              const s = RDV_MAP[r.statut] || {};
              return (
                <div key={r.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: i < rdvAuj.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ minWidth: 44, textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.blue, fontFamily: "'Syne', sans-serif" }}>{r.heure}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>{c?.nom || "—"}</div>
                    <div style={{ fontSize: 11, color: T.text1 }}>{v?.immat || "—"} · {TYPE_MAP[r.type]}</div>
                  </div>
                  <StatusBadge value={r.statut} map={RDV_MAP} />
                </div>
              );
            })}
        </GlassCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Interventions récentes */}
        <GlassCard style={{ padding: "20px 0" }}>
          <div style={{ padding: "0 22px 16px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: "'Syne', sans-serif" }}>Interventions récentes</div>
          </div>
          {recentInt.length === 0 ? <Empty icon="wrench" text="Aucune intervention" />
            : recentInt.map((i, idx) => {
              const v = db.vehicules.find(x => x.id === i.vehicle_id);
              const c = v ? db.clients.find(x => x.id === v.client_id) : null;
              return (
                <div key={i.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: idx < recentInt.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: T.blueDim, border: `1px solid ${T.blue}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="wrench" size={14} color={T.blue} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text0 }}>{TYPE_MAP[i.type]}</div>
                    <div style={{ fontSize: 11, color: T.text1 }}>{v?.immat || "—"} · {c?.nom || "—"} · {fmtDate(i.date)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.green, fontFamily: "'Syne', sans-serif" }}>{fmt(i.prix_reel || i.prix_estime)} TND</div>
                    <StatusBadge value={i.statut === "termine" ? "termine" : "cours"} map={{ cours: { label: "En cours", color: T.blue }, termine: { label: "Terminée", color: T.green } }} />
                  </div>
                </div>
              );
            })}
        </GlassCard>

        {/* Crédits */}
        <GlassCard style={{ padding: "20px 0", border: `1px solid rgba(239,68,68,0.15)` }}>
          <div style={{ padding: "0 22px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alert" size={14} color={T.red} />
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: "'Syne', sans-serif" }}>Crédits impayés</div>
          </div>
          {clientsCredit.length === 0
            ? <Empty icon="check" text="Aucun crédit en attente" />
            : clientsCredit.slice(0, 6).map((c, i) => (
              <div key={c.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 22px", borderBottom: i < clientsCredit.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text0 }}>{c.nom}</div>
                  <div style={{ fontSize: 11, color: T.text1 }}>{c.telephone}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.red, fontFamily: "'Syne', sans-serif" }}>{fmt(c.credit)} TND</div>
              </div>
            ))}
        </GlassCard>
      </div>
    </div>
  );
}

// ── AGENDA ────────────────────────────────────────────────────────────────────
function RdvForm({ initial = {}, db, onSave, onCancel, saving }) {
  const [f, setF] = useState({ clientId: initial.client_id || "", vehicleId: initial.vehicle_id || "", date: initial.date || today(), heure: initial.heure || "09:00", type: initial.type || "reparation", description: initial.description || "", statut: initial.statut || "confirme", notes: initial.notes || "" });
  const s = k => v => setF(x => ({ ...x, [k]: v }));
  const clientVehicles = db.vehicules.filter(v => v.client_id === f.clientId);
  return (
    <FormGrid>
      <Field label="Client *" value={f.clientId} onChange={v => { s("clientId")(v); s("vehicleId")(""); }} options={db.clients.map(c => ({ value: c.id, label: `${c.nom} — ${c.telephone || ""}` }))} />
      {f.clientId && <Field label="Véhicule" value={f.vehicleId} onChange={s("vehicleId")} options={clientVehicles.map(v => ({ value: v.id, label: `${v.immat} — ${v.marque} ${v.modele}` }))} />}
      <FormRow>
        <Field label="Date *" type="date" value={f.date} onChange={s("date")} />
        <Field label="Heure" value={f.heure} onChange={s("heure")} options={HEURES.map(h => ({ value: h, label: h }))} />
      </FormRow>
      <FormRow>
        <Field label="Type" value={f.type} onChange={s("type")} options={Object.entries(TYPE_MAP).map(([v, l]) => ({ value: v, label: l }))} />
        <Field label="Statut" value={f.statut} onChange={s("statut")} options={[{ value: "confirme", label: "Confirmé" }, { value: "attente", label: "En attente" }, { value: "annule", label: "Annulé" }]} />
      </FormRow>
      <Field label="Description" value={f.description} onChange={s("description")} placeholder="Motif du rendez-vous..." />
      <Field label="Notes" value={f.notes} onChange={s("notes")} />
      <FormActions onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </FormGrid>
  );
}

function Agenda({ db, ops }) {
  const [cur, setCur] = useState(new Date());
  const [sel, setSel] = useState(today());
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const yr = cur.getFullYear(), mo = cur.getMonth();
  const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const JOURS = ["L","M","M","J","V","S","D"];
  const firstDow = (new Date(yr, mo, 1).getDay() + 6) % 7;
  const daysInMo = new Date(yr, mo + 1, 0).getDate();
  const getRdvs = d => { const ds = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; return db.rendez_vous.filter(r => r.date === ds && r.statut !== "annule").sort((a, b) => a.heure.localeCompare(b.heure)); };
  const rdvsSel = db.rendez_vous.filter(r => r.date === sel).sort((a, b) => a.heure.localeCompare(b.heure));
  const handleSave = async (form) => { setSaving(true); try { if (modal.type === "add") await ops.addRdv(form); else await ops.updateRdv(modal.rdv.id, form); setModal(null); } finally { setSaving(false); } };
  const handleConvert = async (rdv) => { if (!rdv.vehicle_id) { alert("Pas de véhicule associé."); return; } if (!confirm("Convertir en intervention ?")) return; await ops.convertirRdv(rdv); };
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)];

  return (
    <div className="fade-up">
      <SectionHeader title="Agenda & Rendez-vous" action={<Btn icon="plus" onClick={() => setModal({ type: "add", prefillDate: sel })}>Nouveau RDV</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <GlassCard style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setCur(new Date(yr, mo - 1))} className="btn-hover" style={{ background: T.glass, border: `1px solid ${T.border}`, color: T.text1, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chevronL" size={14} color="currentColor" /></button>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: T.text0 }}>{MOIS[mo]} {yr}</div>
            <button onClick={() => setCur(new Date(yr, mo + 1))} className="btn-hover" style={{ background: T.glass, border: `1px solid ${T.border}`, color: T.text1, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chevronR" size={14} color="currentColor" /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
            {JOURS.map((j, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: T.blue, padding: "4px 0", textTransform: "uppercase" }}>{j}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const ds = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const rdvs = getRdvs(d);
              const isToday = ds === today(), isSel = ds === sel;
              return (
                <div key={i} onClick={() => setSel(ds)} style={{ minHeight: 56, borderRadius: 8, padding: "5px 6px", cursor: "pointer", background: isSel ? T.blue : isToday ? T.blueDim : "transparent", border: `1px solid ${isSel ? T.blue : isToday ? `${T.blue}50` : T.border}`, transition: "all 0.15s" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isSel ? "#fff" : isToday ? T.blue : T.text1, marginBottom: 3 }}>{d}</div>
                  {rdvs.slice(0, 2).map((r, ri) => {
                    const s = RDV_MAP[r.statut] || {};
                    return <div key={ri} style={{ background: isSel ? "rgba(255,255,255,0.2)" : `${s.color}20`, borderRadius: 3, padding: "1px 4px", fontSize: 9, fontWeight: 700, color: isSel ? "#fff" : s.color, marginBottom: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{r.heure}</div>;
                  })}
                  {rdvs.length > 2 && <div style={{ fontSize: 9, color: isSel ? "rgba(255,255,255,0.7)" : T.text2 }}>+{rdvs.length - 2}</div>}
                </div>
              );
            })}
          </div>
        </GlassCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <GlassCard style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: "'Syne', sans-serif" }}>{fmtDateLong(sel)}</div>
                <div style={{ fontSize: 11, color: T.text1, marginTop: 2 }}>{rdvsSel.length} rendez-vous</div>
              </div>
              <Btn size="sm" icon="plus" onClick={() => setModal({ type: "add", prefillDate: sel })}>RDV</Btn>
            </div>
            {rdvsSel.length === 0 ? <Empty icon="calendar" text="Aucun RDV" />
              : rdvsSel.map(r => {
                const client = db.clients.find(c => c.id === r.client_id);
                const veh = db.vehicules.find(v => v.id === r.vehicle_id);
                return (
                  <div key={r.id} style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: T.blue, fontFamily: "'Syne', sans-serif", minWidth: 44 }}>{r.heure}</div>
                      <StatusBadge value={r.statut} map={RDV_MAP} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>{client?.nom || "—"}</div>
                    <div style={{ fontSize: 11, color: T.text1, marginBottom: 2 }}>{veh ? `${veh.immat} · ${veh.marque}` : "—"}</div>
                    <div style={{ fontSize: 11, color: T.blue, fontWeight: 600 }}>{TYPE_MAP[r.type]}</div>
                    {r.description && <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>{r.description}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {r.statut !== "converti" && r.statut !== "annule" && <Btn size="sm" variant="success" icon="convert" onClick={() => handleConvert(r)}>Convertir</Btn>}
                      <Btn size="sm" variant="ghost" icon="edit" onClick={() => setModal({ type: "edit", rdv: r })} />
                      <Btn size="sm" variant="danger" icon="trash" onClick={async () => { if (confirm("Supprimer ?")) await ops.deleteRdv(r.id); }} />
                    </div>
                  </div>
                );
              })}
          </GlassCard>
        </div>
      </div>

      <GlassCard style={{ marginTop: 16, padding: "0" }}>
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text0, fontFamily: "'Syne', sans-serif" }}>Tous les RDV à venir</div>
        {db.rendez_vous.filter(r => r.date >= today() && r.statut !== "annule").sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure)).slice(0, 15).map((r, i, arr) => {
          const c = db.clients.find(x => x.id === r.client_id);
          const v = db.vehicules.find(x => x.id === r.vehicle_id);
          return (
            <div key={r.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 22px", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ minWidth: 80 }}>
                  <div style={{ fontSize: 11, color: T.text2 }}>{fmtDate(r.date)}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: T.blue, fontFamily: "'Syne', sans-serif" }}>{r.heure}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>{c?.nom || "—"}</div>
                  <div style={{ fontSize: 11, color: T.text1 }}>{v?.immat || "—"} · {TYPE_MAP[r.type]}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusBadge value={r.statut} map={RDV_MAP} />
                {r.statut !== "converti" && r.statut !== "annule" && <Btn size="sm" variant="success" icon="convert" onClick={() => handleConvert(r)} />}
                <Btn size="sm" variant="ghost" icon="edit" onClick={() => setModal({ type: "edit", rdv: r })} />
                <Btn size="sm" variant="danger" icon="trash" onClick={async () => { if (confirm("Supprimer ?")) await ops.deleteRdv(r.id); }} />
              </div>
            </div>
          );
        })}
      </GlassCard>

      {modal && (
        <Modal title={modal.type === "add" ? "Nouveau rendez-vous" : "Modifier rendez-vous"} onClose={() => setModal(null)} width={520}>
          <RdvForm initial={modal.rdv || (modal.prefillDate ? { date: modal.prefillDate } : {})} db={db} onSave={handleSave} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ── CLIENTS ───────────────────────────────────────────────────────────────────
function ClientForm({ initial = {}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ nom: initial.nom || "", telephone: initial.telephone || "", credit: initial.credit || "0", notes: initial.notes || "" });
  const s = k => v => setF(x => ({ ...x, [k]: v }));
  return (
    <FormGrid>
      <Field label="Nom complet *" value={f.nom} onChange={s("nom")} placeholder="Mohamed Ben Ali" />
      <Field label="Téléphone" value={f.telephone} onChange={s("telephone")} placeholder="+216 XX XXX XXX" />
      <Field label="Crédit dû (TND)" type="number" value={String(f.credit)} onChange={s("credit")} />
      <Field label="Notes" value={f.notes} onChange={s("notes")} />
      <FormActions onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </FormGrid>
  );
}

function Clients({ db, ops }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const filtered = db.clients.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()) || (c.telephone || "").includes(search));
  const handleSave = async (form) => { setSaving(true); try { if (modal.type === "add") await ops.addClient(form); else await ops.updateClient(modal.client.id, form); setModal(null); } finally { setSaving(false); } };
  const clientVehicles = selected ? db.vehicules.filter(v => v.client_id === selected.id) : [];
  const clientInterventions = selected ? db.interventions.filter(i => clientVehicles.some(v => v.id === i.vehicle_id)) : [];
  const clientRdvs = selected ? [...db.rendez_vous.filter(r => r.client_id === selected.id)].sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <div className="fade-up">
      <SectionHeader title="Clients" action={<Btn icon="plus" onClick={() => setModal({ type: "add" })}>Nouveau client</Btn>} />
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom ou téléphone..." />
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
        <GlassCard style={{ padding: 0 }}>
          {filtered.length === 0 ? <Empty icon="users" text="Aucun client" />
            : filtered.map((c, i) => (
              <div key={c.id} className="row-hover" onClick={() => setSelected(selected?.id === c.id ? null : c)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none", cursor: "pointer", background: selected?.id === c.id ? T.blueDim : "transparent", borderLeft: `2px solid ${selected?.id === c.id ? T.blue : "transparent"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: T.blueDim, border: `1px solid ${T.blue}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.blue, fontFamily: "'Syne', sans-serif" }}>{c.nom[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>{c.nom}</div>
                    <div style={{ fontSize: 11, color: T.text1 }}>{c.telephone} · {db.vehicules.filter(v => v.client_id === c.id).length} véhicule(s)</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {Number(c.credit) > 0 && <span style={{ background: T.redDim, color: T.red, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{fmt(c.credit)} TND</span>}
                  <Btn size="sm" variant="ghost" icon="edit" onClick={e => { e.stopPropagation(); setModal({ type: "edit", client: c }); }} />
                  <Btn size="sm" variant="danger" icon="trash" onClick={e => { e.stopPropagation(); if (confirm("Supprimer ?")) { ops.deleteClient(c.id); if (selected?.id === c.id) setSelected(null); } }} />
                </div>
              </div>
            ))}
        </GlassCard>

        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="slide-in">
            <GlassCard style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: T.blueDim, border: `1px solid ${T.blue}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: T.blue, fontFamily: "'Syne', sans-serif" }}>{selected.nom[0]}</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.text0, fontFamily: "'Syne', sans-serif" }}>{selected.nom}</div>
                  <div style={{ fontSize: 12, color: T.text1 }}>{selected.telephone || "—"}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Crédit</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: Number(selected.credit) > 0 ? T.red : T.green, fontFamily: "'Syne', sans-serif" }}>{fmt(selected.credit)} TND</div>
                </div>
                <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: T.text2, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Interventions</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text0, fontFamily: "'Syne', sans-serif" }}>{clientInterventions.length}</div>
                </div>
              </div>
            </GlassCard>

            {clientVehicles.length > 0 && (
              <GlassCard style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text1, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Véhicules</div>
                {clientVehicles.map((v, i) => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < clientVehicles.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.blue }}>{v.immat}</span>
                      <span style={{ fontSize: 12, color: T.text1 }}> · {v.marque} {v.modele}</span>
                    </div>
                    <StatusBadge value={v.status} map={STATUS_MAP} />
                  </div>
                ))}
              </GlassCard>
            )}

            {clientRdvs.length > 0 && (
              <GlassCard style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text1, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Rendez-vous récents</div>
                {clientRdvs.slice(0, 4).map((r, i) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < Math.min(clientRdvs.length, 4) - 1 ? `1px solid ${T.border}` : "none", fontSize: 12 }}>
                    <span style={{ color: T.text1 }}>{fmtDate(r.date)} {r.heure} · {TYPE_MAP[r.type]}</span>
                    <StatusBadge value={r.statut} map={RDV_MAP} />
                  </div>
                ))}
              </GlassCard>
            )}

            {clientInterventions.length > 0 && (
              <GlassCard style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text1, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Historique</div>
                {[...clientInterventions].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5).map((i, idx, arr) => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: idx < arr.length - 1 ? `1px solid ${T.border}` : "none", fontSize: 12 }}>
                    <span style={{ color: T.text1 }}><strong style={{ color: T.text0 }}>{TYPE_MAP[i.type]}</strong> · {fmtDate(i.date)}</span>
                    <strong style={{ color: T.green }}>{fmt(i.prix_reel || i.prix_estime)} TND</strong>
                  </div>
                ))}
              </GlassCard>
            )}
          </div>
        )}
      </div>
      {modal && (
        <Modal title={modal.type === "add" ? "Nouveau client" : "Modifier client"} onClose={() => setModal(null)}>
          <ClientForm initial={modal.client || {}} onSave={handleSave} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ── VEHICULES ─────────────────────────────────────────────────────────────────
function VehiculeForm({ initial = {}, clients, onSave, onCancel, saving }) {
  const [f, setF] = useState({ clientId: initial.client_id || "", immat: initial.immat || "", marque: initial.marque || "", modele: initial.modele || "", annee: initial.annee || "", couleur: initial.couleur || "", km: initial.km || "", status: initial.status || "attente", notes: initial.notes || "" });
  const s = k => v => setF(x => ({ ...x, [k]: v }));
  return (
    <FormGrid>
      <Field label="Client *" value={f.clientId} onChange={s("clientId")} options={clients.map(c => ({ value: c.id, label: c.nom }))} />
      <FormRow><Field label="Immatriculation *" value={f.immat} onChange={s("immat")} placeholder="123 TU 4567" /><Field label="Statut" value={f.status} onChange={s("status")} options={Object.entries(STATUS_MAP).map(([v, s]) => ({ value: v, label: s.label }))} /></FormRow>
      <FormRow><Field label="Marque" value={f.marque} onChange={s("marque")} placeholder="Toyota" /><Field label="Modèle" value={f.modele} onChange={s("modele")} placeholder="Yaris" /></FormRow>
      <FormRow><Field label="Année" type="number" value={f.annee} onChange={s("annee")} /><Field label="Couleur" value={f.couleur} onChange={s("couleur")} /></FormRow>
      <Field label="Kilométrage" type="number" value={String(f.km)} onChange={s("km")} />
      <Field label="Notes" value={f.notes} onChange={s("notes")} />
      <FormActions onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </FormGrid>
  );
}

function Vehicules({ db, ops }) {
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const filtered = db.vehicules.filter(v => {
    const c = db.clients.find(x => x.id === v.client_id);
    return (filterStatus === "all" || v.status === filterStatus) && (!search || (v.immat || "").toLowerCase().includes(search.toLowerCase()) || (v.marque || "").toLowerCase().includes(search.toLowerCase()) || (c?.nom || "").toLowerCase().includes(search.toLowerCase()));
  });
  const handleSave = async (form) => { setSaving(true); try { if (modal.type === "add") await ops.addVehicule(form); else await ops.updateVehicule(modal.vehicle.id, form); setModal(null); } finally { setSaving(false); } };

  return (
    <div className="fade-up">
      <SectionHeader title="Véhicules" action={<Btn icon="plus" onClick={() => setModal({ type: "add" })}>Nouveau véhicule</Btn>} />
      <SearchBar value={search} onChange={setSearch} placeholder="Immatriculation, marque, client..." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", ...Object.keys(STATUS_MAP)].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className="btn-hover" style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: filterStatus === s ? T.blue : T.glass, color: filterStatus === s ? "#fff" : T.text1, border: `1px solid ${filterStatus === s ? T.blue : T.border}`, transition: "all 0.15s" }}>
            {s === "all" ? "Tous" : STATUS_MAP[s].label}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {filtered.length === 0 && <div style={{ gridColumn: "1/-1" }}><Empty icon="car" text="Aucun véhicule trouvé" /></div>}
        {filtered.map(v => {
          const client = db.clients.find(c => c.id === v.client_id);
          const s = STATUS_MAP[v.status] || {};
          return (
            <GlassCard key={v.id} style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: T.blue, fontFamily: "'Syne', sans-serif", letterSpacing: 1 }}>{v.immat}</div>
                  <div style={{ fontSize: 13, color: T.text0, fontWeight: 600 }}>{v.marque} {v.modele} {v.annee}</div>
                  <div style={{ fontSize: 11, color: T.text1 }}>{client?.nom || "—"}</div>
                </div>
                <StatusBadge value={v.status} map={STATUS_MAP} />
              </div>
              {(v.km || v.couleur) && <div style={{ fontSize: 11, color: T.text2, marginBottom: 14 }}>{v.km ? `${fmt(v.km)} km` : ""}{v.couleur ? ` · ${v.couleur}` : ""}</div>}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select value={v.status} onChange={e => ops.updateVehiculeStatus(v.id, e.target.value)} style={{ flex: 1, padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, color: T.text0, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  {Object.entries(STATUS_MAP).map(([val, sm]) => <option key={val} value={val}>{sm.label}</option>)}
                </select>
                <Btn size="sm" variant="ghost" icon="edit" onClick={() => setModal({ type: "edit", vehicle: v })} />
                <Btn size="sm" variant="danger" icon="trash" onClick={async () => { if (confirm("Supprimer ?")) await ops.deleteVehicule(v.id); }} />
              </div>
            </GlassCard>
          );
        })}
      </div>
      {modal && (
        <Modal title={modal.type === "add" ? "Nouveau véhicule" : "Modifier véhicule"} onClose={() => setModal(null)} width={560}>
          <VehiculeForm initial={modal.vehicle || {}} clients={db.clients} onSave={handleSave} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ── INTERVENTIONS ─────────────────────────────────────────────────────────────
function InterventionForm({ initial = {}, db, onSave, onCancel, saving }) {
  const [f, setF] = useState({ vehicleId: initial.vehicle_id || "", type: initial.type || "reparation", date: initial.date || today(), description: initial.description || "", prixEstime: initial.prix_estime || "", prixReel: initial.prix_reel || "", pieces: initial.pieces || "", statut: initial.statut || "cours", notes: initial.notes || "" });
  const s = k => v => setF(x => ({ ...x, [k]: v }));
  const selV = db.vehicules.find(v => v.id === f.vehicleId);
  const selC = selV ? db.clients.find(c => c.id === selV.client_id) : null;
  return (
    <FormGrid>
      <Field label="Véhicule *" value={f.vehicleId} onChange={s("vehicleId")} options={db.vehicules.map(v => { const c = db.clients.find(x => x.id === v.client_id); return { value: v.id, label: `${v.immat} — ${v.marque} (${c?.nom || "?"})` }; })} />
      {selC && (
        <div style={{ background: T.greenDim, border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: T.text1 }}>
          <strong style={{ color: T.text0 }}>{selC.nom}</strong> · {selC.telephone}
          {Number(selC.credit) > 0 && <span style={{ color: T.red, marginLeft: 8, fontWeight: 700 }}>— Crédit: {fmt(selC.credit)} TND</span>}
        </div>
      )}
      <FormRow>
        <Field label="Type" value={f.type} onChange={s("type")} options={Object.entries(TYPE_MAP).map(([v, l]) => ({ value: v, label: l }))} />
        <Field label="Date" type="date" value={f.date} onChange={s("date")} />
      </FormRow>
      <FormRow>
        <Field label="Prix estimé (TND)" type="number" value={String(f.prixEstime)} onChange={s("prixEstime")} />
        <Field label="Prix réel (TND)" type="number" value={String(f.prixReel)} onChange={s("prixReel")} />
      </FormRow>
      <Field label="Statut" value={f.statut} onChange={s("statut")} options={[{ value: "cours", label: "En cours" }, { value: "termine", label: "Terminée" }]} />
      <Field label="Description" value={f.description} onChange={s("description")} placeholder="Détails..." />
      <Field label="Pièces utilisées" value={f.pieces} onChange={s("pieces")} placeholder="filtre huile, courroie..." />
      <FormActions onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </FormGrid>
  );
}

function Interventions({ db, ops }) {
  const [modal, setModal] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const filtered = [...db.interventions].filter(i => {
    const v = db.vehicules.find(x => x.id === i.vehicle_id);
    const c = v ? db.clients.find(x => x.id === v.client_id) : null;
    return (filterType === "all" || i.type === filterType) && (!search || (v?.immat || "").toLowerCase().includes(search.toLowerCase()) || (c?.nom || "").toLowerCase().includes(search.toLowerCase()));
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const handleSave = async (form) => { setSaving(true); try { if (modal.type === "add") await ops.addIntervention(form); else await ops.updateIntervention(modal.intervention.id, form); setModal(null); } finally { setSaving(false); } };

  return (
    <div className="fade-up">
      <SectionHeader title="Interventions" action={<Btn icon="plus" onClick={() => setModal({ type: "add" })}>Nouvelle intervention</Btn>} />
      <SearchBar value={search} onChange={setSearch} placeholder="Immatriculation ou client..." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", ...Object.keys(TYPE_MAP)].map(t => (
          <button key={t} onClick={() => setFilterType(t)} className="btn-hover" style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: filterType === t ? T.blue : T.glass, color: filterType === t ? "#fff" : T.text1, border: `1px solid ${filterType === t ? T.blue : T.border}`, transition: "all 0.15s" }}>
            {t === "all" ? "Tous" : TYPE_MAP[t]}
          </button>
        ))}
      </div>
      <GlassCard style={{ padding: 0 }}>
        {filtered.length === 0 ? <Empty icon="wrench" text="Aucune intervention" />
          : filtered.map((i, idx, arr) => {
            const v = db.vehicules.find(x => x.id === i.vehicle_id);
            const c = v ? db.clients.find(x => x.id === v.client_id) : null;
            const isTermine = i.statut === "termine";
            return (
              <div key={i.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: idx < arr.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: isTermine ? T.greenDim : T.blueDim, border: `1px solid ${isTermine ? "rgba(16,185,129,0.3)" : `${T.blue}30`}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="wrench" size={15} color={isTermine ? T.green : T.blue} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>{TYPE_MAP[i.type]}</span>
                      <StatusBadge value={isTermine ? "termine" : "cours"} map={{ cours: { label: "En cours", color: T.blue }, termine: { label: "Terminée", color: T.green } }} />
                    </div>
                    <div style={{ fontSize: 11, color: T.text1 }}>{v?.immat || "—"} · {c?.nom || "—"} · {fmtDate(i.date)}</div>
                    {i.description && <div style={{ fontSize: 11, color: T.text2 }}>{i.description}</div>}
                    {i.pieces && <div style={{ fontSize: 11, color: T.text2 }}>Pièces: {i.pieces}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ textAlign: "right" }}>
                    {i.prix_estime && <div style={{ fontSize: 10, color: T.text2 }}>Estimé: {fmt(i.prix_estime)} TND</div>}
                    <div style={{ fontSize: 16, fontWeight: 900, color: T.green, fontFamily: "'Syne', sans-serif" }}>{fmt(i.prix_reel || i.prix_estime)} TND</div>
                  </div>
                  <Btn size="sm" variant="ghost" icon="edit" onClick={() => setModal({ type: "edit", intervention: i })} />
                  <Btn size="sm" variant="danger" icon="trash" onClick={async () => { if (confirm("Supprimer ?")) await ops.deleteIntervention(i.id); }} />
                </div>
              </div>
            );
          })}
      </GlassCard>
      {modal && (
        <Modal title={modal.type === "add" ? "Nouvelle intervention" : "Modifier"} onClose={() => setModal(null)} width={560}>
          <InterventionForm initial={modal.intervention || {}} db={db} onSave={handleSave} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ── CAISSE ────────────────────────────────────────────────────────────────────
function CaisseForm({ clients, onSave, onCancel, saving }) {
  const [f, setF] = useState({ type: "entree", montant: "", description: "", date: today(), clientId: "", category: "" });
  const s = k => v => setF(x => ({ ...x, [k]: v }));
  const cats = f.type === "entree" ? ["Paiement intervention", "Vente pièces", "Lavage", "Acompte", "Autre"] : ["Achat pièces", "Salaires", "Loyer", "Électricité", "Eau", "Carburant", "Divers"];
  return (
    <FormGrid>
      <FormRow>
        <Field label="Type" value={f.type} onChange={s("type")} options={[{ value: "entree", label: "Entrée" }, { value: "sortie", label: "Sortie" }]} />
        <Field label="Date" type="date" value={f.date} onChange={s("date")} />
      </FormRow>
      <FormRow>
        <Field label="Montant (TND) *" type="number" value={f.montant} onChange={s("montant")} />
        <Field label="Catégorie" value={f.category} onChange={s("category")} options={cats.map(c => ({ value: c, label: c }))} />
      </FormRow>
      <Field label="Description *" value={f.description} onChange={s("description")} placeholder="Détail de l'opération..." />
      {f.type === "entree" && <Field label="Client (optionnel)" value={f.clientId} onChange={s("clientId")} options={clients.map(c => ({ value: c.id, label: `${c.nom} — crédit: ${fmt(c.credit)} TND` }))} />}
      <FormActions onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </FormGrid>
  );
}

function Caisse({ db, ops }) {
  const [modal, setModal] = useState(false);
  const [filterDate, setFilterDate] = useState(today());
  const [filterType, setFilterType] = useState("all");
  const [saving, setSaving] = useState(false);
  const filtered = [...db.caisse].filter(c => (!filterDate || c.date === filterDate) && (filterType === "all" || c.type === filterType)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const entrees = filtered.filter(c => c.type === "entree").reduce((s, c) => s + Number(c.montant), 0);
  const sorties = filtered.filter(c => c.type === "sortie").reduce((s, c) => s + Number(c.montant), 0);
  const handleSave = async (form) => { setSaving(true); try { await ops.addCaisse(form); setModal(false); } finally { setSaving(false); } };

  return (
    <div className="fade-up">
      <SectionHeader title="Caisse" action={<Btn icon="plus" onClick={() => setModal(true)}>Nouvelle opération</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <KPICard label="Entrées" value={`${fmt(entrees)} TND`} color={T.green} icon="trendUp" />
        <KPICard label="Sorties" value={`${fmt(sorties)} TND`} color={T.red} icon="wallet" />
        <KPICard label="Solde" value={`${fmt(entrees - sorties)} TND`} color={entrees - sorties >= 0 ? T.green : T.red} icon="activity" />
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input-field"
          style={{ padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text0, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
        <button onClick={() => setFilterDate("")} className="btn-hover" style={{ padding: "8px 14px", background: T.glass, border: `1px solid ${T.border}`, color: T.text1, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Tout voir</button>
        {["all", "entree", "sortie"].map(t => (
          <button key={t} onClick={() => setFilterType(t)} className="btn-hover" style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: filterType === t ? T.blue : T.glass, color: filterType === t ? "#fff" : T.text1, border: `1px solid ${filterType === t ? T.blue : T.border}`, transition: "all 0.15s" }}>
            {t === "all" ? "Toutes" : t === "entree" ? "Entrées" : "Sorties"}
          </button>
        ))}
      </div>
      <GlassCard style={{ padding: 0 }}>
        {filtered.length === 0 ? <Empty icon="wallet" text="Aucune opération" />
          : filtered.map((op, i, arr) => {
            const client = op.client_id ? db.clients.find(c => c.id === op.client_id) : null;
            const isEntree = op.type === "entree";
            return (
              <div key={op.id} className="row-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: isEntree ? T.greenDim : T.redDim, border: `1px solid ${isEntree ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={isEntree ? "trendUp" : "wallet"} size={14} color={isEntree ? T.green : T.red} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>{op.description}</div>
                    <div style={{ fontSize: 11, color: T.text1 }}>
                      {fmtDate(op.date)}{op.category ? ` · ${op.category}` : ""}{client ? ` · ${client.nom}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: isEntree ? T.green : T.red, fontFamily: "'Syne', sans-serif" }}>
                    {isEntree ? "+" : "−"}{fmt(op.montant)} TND
                  </div>
                  <Btn size="sm" variant="danger" icon="trash" onClick={async () => { if (confirm("Supprimer ?")) await ops.deleteCaisse(op.id); }} />
                </div>
              </div>
            );
          })}
      </GlassCard>
      {modal && (
        <Modal title="Nouvelle opération" onClose={() => setModal(false)} width={500}>
          <CaisseForm clients={db.clients} onSave={handleSave} onCancel={() => setModal(false)} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",    icon: "dashboard" },
  { id: "agenda",        label: "Agenda",        icon: "calendar" },
  { id: "clients",       label: "Clients",       icon: "users" },
  { id: "vehicules",     label: "Véhicules",     icon: "car" },
  { id: "interventions", label: "Interventions", icon: "wrench" },
  { id: "caisse",        label: "Caisse",        icon: "wallet" },
];

function Sidebar({ tab, setTab, syncing, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const W = expanded ? 220 : 64;

  return (
    <div onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}
      style={{ width: W, minHeight: "100vh", background: "#080B14", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", transition: "width 0.2s ease", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 50, overflow: "hidden" }}>

      {/* Logo */}
      <div style={{ padding: "20px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, height: 64, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.gold}, #F97316)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 16px rgba(245,158,11,0.35)`, animation: "glow 3s ease infinite" }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#000", fontFamily: "'Syne', sans-serif" }}>B</span>
        </div>
        {expanded && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: T.text0, fontFamily: "'Syne', sans-serif", letterSpacing: 0.5 }}>BMZ AUTO</div>
            <div style={{ fontSize: 10, color: T.text2, letterSpacing: 1.5, textTransform: "uppercase" }}>Services · Ariana</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className="nav-item"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: active ? T.blueDim : "transparent", border: "none", cursor: "pointer", color: active ? T.blue : T.text2, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", borderLeft: `2px solid ${active ? T.blue : "transparent"}`, boxShadow: active ? `inset 0 0 20px rgba(14,165,233,0.05)` : "none", textAlign: "left", whiteSpace: "nowrap" }}>
              <span style={{ flexShrink: 0 }}><Icon name={item.icon} size={18} color="currentColor" /></span>
              {expanded && <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Sync */}
      <div style={{ padding: "12px 8px", borderTop: `1px solid ${T.border}` }}>
        <button onClick={onRefresh} className="nav-item"
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "transparent", border: "none", cursor: "pointer", color: T.text2, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
          <span style={{ flexShrink: 0, animation: syncing ? "spin 0.6s linear infinite" : "none", display: "inline-flex" }}>
            <Icon name="refresh" size={16} color="currentColor" />
          </span>
          {expanded && <span style={{ fontSize: 13, fontWeight: 500 }}>{syncing ? "Synchronisation..." : "Synchroniser"}</span>}
        </button>
      </div>
    </div>
  );
}

// ── LOADING ───────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{ position: "relative" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${T.gold}, #F97316)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px rgba(245,158,11,0.4)`, animation: "glow 2s ease infinite" }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: "#000", fontFamily: "'Syne', sans-serif" }}>B</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 900, color: T.text0, fontFamily: "'Syne', sans-serif", letterSpacing: 2, textAlign: "center" }}>BMZ AUTO SERVICES</div>
        <div style={{ fontSize: 11, color: T.text2, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", marginTop: 4 }}>Garage · Ariana, Tunis</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.text2, fontSize: 12 }}>
        <Spinner /> <span>Connexion à la base de données...</span>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const { db, loading, syncing, toast, refresh, ...ops } = useDB();

  if (loading) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <LoadingScreen />
    </>
  );

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: T.bg0 }}>
        <Sidebar tab={tab} setTab={setTab} syncing={syncing} onRefresh={refresh} />
        <main style={{ flex: 1, marginLeft: 64, padding: "32px 36px", minHeight: "100vh", transition: "margin 0.2s" }}>
          {tab === "dashboard"     && <Dashboard db={db} setTab={setTab} />}
          {tab === "agenda"        && <Agenda db={db} ops={ops} />}
          {tab === "clients"       && <Clients db={db} ops={ops} />}
          {tab === "vehicules"     && <Vehicules db={db} ops={ops} />}
          {tab === "interventions" && <Interventions db={db} ops={ops} />}
          {tab === "caisse"        && <Caisse db={db} ops={ops} />}
        </main>
        <Toast toast={toast} />
      </div>
    </>
  );
}
