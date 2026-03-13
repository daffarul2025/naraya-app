import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE (null-safe) ─────────────────────────────────────────────────────
const _url = import.meta.env.VITE_SUPABASE_URL;
const _key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (_url && _key) ? createClient(_url, _key) : null;

const SESSION_KEY = "naraya_session";
const STORAGE_KEY = "naraya_data";

const DD = {
  posts: [],
  monthlyTarget: 1500,
  creators: ["Arya","Darul","Revi","Vika","Nessa","Khaira"],
  accounts: ["WiFicerdas","NarayaConnect","Curhat.santui","SobatNgadu","Mbokdewor","GA.naratelgroup"],
  themes:   ["Edukasi","Promosi","Hiburan","Informasi","Tutorial","Motivasi","Lifestyle","Review"],
};

// ─── USERS — disimpan di Supabase (id=2) + localStorage backup ──────────────
const USERS_KEY = "naraya_users_v3";
const DEFAULT_USERS = {
  "admin": {pass:"admin123",  role:"admin",      name:"Admin"},
  "darul": {pass:"darul123",  role:"freelancer",  name:"Daffarul Firdaus Ilmi"},
  "aryak": {pass:"aryak123",  role:"freelancer",  name:"Arya Kusuma"},
};
function sanitizeUsers(parsed){
  const out={};
  for(const [k,v] of Object.entries(parsed||{})){
    if(typeof v==="object"&&v!==null&&v.pass&&v.role)
      out[k]={pass:v.pass,role:v.role,name:v.name||k};
  }
  // Pastikan akun default selalu ada
  for(const [k,v] of Object.entries(DEFAULT_USERS)){
    if(!out[k]) out[k]={...v};
  }
  return out;
}
function loadUsers(){
  try{
    const s=localStorage.getItem(USERS_KEY);
    if(s){const p=JSON.parse(s);const u=sanitizeUsers(p);return u;}
  }catch{}
  return{...DEFAULT_USERS};
}
async function loadUsersFromDB(){
  try{
    if(supabase){
      const{data:row,error}=await supabase.from("naraya_settings").select("content").eq("id",2).single();
      if(!error&&row?.content){
        const u=sanitizeUsers(row.content);
        localStorage.setItem(USERS_KEY,JSON.stringify(u));
        return u;
      }
    }
  }catch{}
  return loadUsers();
}
async function saveUsersToDB(u){
  try{ localStorage.setItem(USERS_KEY,JSON.stringify(u)); }catch{}
  try{
    if(supabase)
      await supabase.from("naraya_settings").upsert({id:2,content:u},{onConflict:"id"});
  }catch{}
}
// Jangan cache USERS — selalu baca fresh saat dibutuhkan
const ADMIN_EMAILS = ["admin@naraya.one","naraya.admin@gmail.com"];
function getRoleFromEmail(email) {
  return (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) ? "freelancer" : "admin";
}

const AC  = {"WiFicerdas":"#6366f1","NarayaConnect":"#f59e0b","Curhat.santui":"#ec4899","SobatNgadu":"#10b981","Mbokdewor":"#f97316","GA.naratelgroup":"#3b82f6"};
const CC  = {"Arya":"#8b5cf6","Darul":"#06b6d4","Revi":"#f43f5e","Vika":"#84cc16","Nessa":"#f59e0b","Khaira":"#6366f1"};
const CAC = ["#8b5cf6","#06b6d4","#f43f5e","#84cc16","#f59e0b","#6366f1","#ec4899","#10b981","#f97316","#3b82f6"];
const MI  = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DI  = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const SC  = {
  "Posted":    {color:"#10b981",bg:"#052e16",icon:"✅"},
  "Scheduled": {color:"#3b82f6",bg:"#0c1a3a",icon:"🗓️"},
  "Draft":     {color:"#f59e0b",bg:"#1a1100",icon:"📝"},
  "":          {color:"#475569",bg:"#1A1F2E",icon:"•"},
};

async function exportCSV(rows, filename, onFb) {
  const xlsxName = filename.replace(/\.csv$/, ".xlsx");
  try {
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = rows[0].map((_, ci) => ({
      wch: Math.max(...rows.map(r => String(r[ci]||"").length), 12)
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, xlsxName);
  } catch {
    const csv = "\ufeff" + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    try {
      const b = new Blob([csv],{type:"text/csv;charset=utf-8;"});
      const u = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href=u; a.download=filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(u);
    } catch { if(onFb) onFb(csv); }
  }
}
const todayStr = () => new Date().toISOString().slice(0,10);
const monthStr = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;

const GCSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=Sora:wght@700;800&family=DM+Mono:wght@500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0A0B10}::-webkit-scrollbar-thumb{background:#1e2535;border-radius:3px}
input,select,textarea,button{font-family:inherit}

/* ── NAV BUTTONS (sidebar) ── */
.nav-btn{background:none;border:none;cursor:pointer;padding:8px 12px;border-radius:10px;display:flex;align-items:center;gap:9px;font-size:13px;font-weight:500;transition:all .15s;color:#475569;width:100%;text-align:left}
.nav-btn:hover{background:#141824;color:#94a3b8}
.nav-btn.active{background:#1A1408;color:#F59E0B;border-left:2px solid #F59E0B;padding-left:10px}

/* ── CARDS ── */
.card{background:#0D0F18;border:1px solid #1A1F2E;border-radius:14px;padding:20px}

/* ── STAT CARD accent bar ── */
.stat-card{background:#0D0F18;border:1px solid #1A1F2E;border-radius:14px;padding:18px 20px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.stat-card.amber::before{background:linear-gradient(90deg,#F59E0B,#F97316)}
.stat-card.green::before{background:linear-gradient(90deg,#10B981,#059669)}
.stat-card.blue::before{background:linear-gradient(90deg,#3B82F6,#6366F1)}
.stat-card.purple::before{background:linear-gradient(90deg,#8B5CF6,#7C3AED)}
.stat-card.red::before{background:linear-gradient(90deg,#EF4444,#DC2626)}

/* ── BUTTONS ── */
.btn-p{background:linear-gradient(135deg,#F59E0B,#F97316);color:white;border:none;padding:9px 18px;border-radius:10px;cursor:pointer;font-size:13.5px;font-weight:700;display:inline-flex;align-items:center;gap:7px;transition:all .18s}
.btn-p:hover{opacity:.88;transform:translateY(-1px)}
.btn-s{background:#141824;color:#94a3b8;border:1px solid #1e2535;padding:8px 16px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:7px;transition:all .15s}
.btn-s:hover{background:#1A1F2E}
.btn-d{background:#1f0808;color:#fca5a5;border:1px solid #5c1a1a;padding:6px 11px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:5px;transition:all .15s}
.btn-d:hover{background:#2d0f0f}

/* ── FORM ── */
.lbl{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;display:block}
.inp{width:100%;background:#0A0B10;border:1px solid #1A1F2E;color:#e2e8f0;padding:10px 13px;border-radius:10px;font-size:14px;outline:none;transition:border-color .18s}
.inp:focus{border-color:#F59E0B}
.tag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600}

/* ── MODALS ── */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)}
.mod{background:#0D0F18;border:1px solid #1A1F2E;border-radius:18px;padding:24px;width:100%;max-width:540px;max-height:92vh;overflow-y:auto}

/* ── TOAST ── */
.toast{position:fixed;bottom:24px;right:24px;z-index:300;padding:12px 18px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:9px;animation:sUp .25s ease;box-shadow:0 8px 32px rgba(0,0,0,.5)}
@keyframes sUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* ── LAYOUT UTILS ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.pbar{height:6px;background:#1A1F2E;border-radius:999px;overflow:hidden}
.pfill{height:100%;border-radius:999px;transition:width .7s ease}
.cday{background:#0A0B10;border:1px solid #1A1F2E;border-radius:10px;min-height:72px;padding:6px;transition:border-color .15s}
.cday.hp{cursor:pointer}.cday.hp:hover{border-color:#2d3a50}
.cday.tc{border-color:#F59E0B!important;background:#1A1408!important}
.cday.om{opacity:.2}
.trow:hover td{background:#0D1120}
.sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}

/* ── TOP NAV BAR ── */
.topnav{height:56px;background:#0D0F18;border-bottom:1px solid #1A1F2E;display:flex;align-items:center;padding:0 24px;gap:0;flex-shrink:0;position:sticky;top:0;z-index:100}
.topnav-logo{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:17px;letter-spacing:-0.5px;display:flex;align-items:center;gap:9px;margin-right:32px}
.topnav-logo-icon{width:29px;height:29px;background:linear-gradient(135deg,#F59E0B,#F97316);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:white;flex-shrink:0}
.topnav-links{display:flex;align-items:center;gap:2px;flex:1}
.topnav-link{padding:6px 13px;border-radius:8px;font-size:13px;font-weight:500;color:#64748B;cursor:pointer;border:none;background:none;transition:all .15s;font-family:inherit;display:flex;align-items:center;gap:7px}
.topnav-link:hover{color:#94A3B8;background:#141824}
.topnav-link.active{color:#F59E0B;background:#1A1408;font-weight:600}
.topnav-user{display:flex;align-items:center;gap:8px;background:#141824;border:1px solid #1E2535;border-radius:10px;padding:5px 12px 5px 6px;cursor:pointer;margin-left:auto;transition:all .15s}
.topnav-user:hover{border-color:#2d3545}
.topnav-avatar{width:27px;height:27px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;background:linear-gradient(135deg,#F59E0B,#F97316);flex-shrink:0}
.topnav-uname{font-size:12.5px;font-weight:600;color:#CBD5E1}
.topnav-role{font-size:10px;color:#475569;font-weight:600}

/* ── SIDEBAR (collapsible hover — desktop) ── */
.mob-topbar{display:none}.mob-overlay{display:none}
.sidebar-wrap{
  width:56px;
  background:#0D0F18;
  border-right:1px solid #1A1F2E;
  display:flex;flex-direction:column;
  padding:12px 6px;
  flex-shrink:0;
  z-index:150;
  overflow:hidden;
  transition:width .22s cubic-bezier(.4,0,.2,1);
  position:relative;
}
.sidebar-wrap:hover{width:220px}
.sidebar-wrap .sidebar-logo-text,.sidebar-wrap .sidebar-label,.sidebar-wrap .sidebar-user-text{
  opacity:0;white-space:nowrap;transition:opacity .15s .05s;pointer-events:none;overflow:hidden;
}
.sidebar-wrap:hover .sidebar-logo-text,
.sidebar-wrap:hover .sidebar-label,
.sidebar-wrap:hover .sidebar-user-text{opacity:1;pointer-events:auto}
.sidebar-wrap .sidebar-icon-only{display:flex!important}
.sidebar-wrap:hover .sidebar-icon-only{display:none!important}
.nav-btn{background:none;border:none;cursor:pointer;padding:8px 10px;border-radius:10px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500;transition:all .15s;color:#475569;width:100%;text-align:left;white-space:nowrap;overflow:hidden}
.nav-btn:hover{background:#141824;color:#94a3b8}
.nav-btn.active{background:#1A1408;color:#F59E0B;border-left:2px solid #F59E0B;padding-left:8px}

@media(max-width:768px){
  .sidebar-wrap{position:fixed!important;left:-220px;top:0;height:100vh;width:210px!important;z-index:150;transition:left .25s ease}
  .sidebar-wrap:hover{width:210px!important}
  .sidebar-wrap.open{left:0;box-shadow:6px 0 30px rgba(0,0,0,.9)}
  .sidebar-wrap .sidebar-logo-text,.sidebar-wrap .sidebar-label,.sidebar-wrap .sidebar-user-text{opacity:1!important}
  .mob-overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:149}
  .mob-topbar{display:flex;background:#0D0F18;border-bottom:1px solid #1A1F2E;padding:0 16px;height:52px;align-items:center;justify-content:space-between;flex-shrink:0}
  .main-pad{padding:16px 14px!important}
  .g2{grid-template-columns:1fr!important}
  .sgrid{grid-template-columns:1fr 1fr!important}
  .desk-only{display:none!important}
}
@media(min-width:769px){.sidebar-wrap{position:relative!important;left:0!important}}

/* ── PAGE HEADER ── */
.page-title{font-family:'Space Grotesk',sans-serif;font-size:21px;font-weight:700;color:#F1F5F9;letter-spacing:-0.4px;margin-bottom:3px}
.page-sub{font-size:12.5px;color:#475569}

/* ── TABLE ── */
.nr-tbl{width:100%;border-collapse:collapse}
.nr-tbl th{font-size:11px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.08em;padding:0 12px 10px;text-align:left;white-space:nowrap}
.nr-tbl td{padding:9px 12px;font-size:13px;border-bottom:1px solid #111520}
.nr-tbl tr:last-child td{border-bottom:none}
.nr-tbl tbody tr:hover td{background:#0D1120}

/* ── STATUS PILLS ── */
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;font-size:11.5px;font-weight:600}
.pill.posted{background:#052E16;color:#10B981}
.pill.draft{background:#1A1100;color:#F59E0B}
.pill.sched{background:#0C1A3A;color:#60A5FA}

/* ── LOGIN PAGE ── */
.login-right-panel{overflow:hidden!important}
.login-right-panel::-webkit-scrollbar{display:none!important}
body:has(.login-right-panel){overflow:hidden!important}
.login-right-panel input{box-sizing:border-box!important;outline:none!important;outline-offset:0!important;-webkit-appearance:none!important}
.login-right-panel input:focus{outline:none!important;border-color:#F97316!important;box-shadow:none!important;transform:none!important}
.login-right-panel *{box-sizing:border-box}
.login-right-panel button:focus,.login-right-panel input:focus,.login-right-panel select:focus{outline:none!important;outline-offset:0!important}

@media(max-width:768px){
  .login-right-panel{max-width:100%!important;width:100%!important;border-left:none!important;height:100vh!important;min-height:unset!important;justify-content:flex-start!important;padding:0!important;overflow-y:auto!important;overflow-x:hidden!important}
  .login-mob-inner{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:32px 24px 40px;width:100%;box-sizing:border-box}
  .login-title-sm{font-size:22px!important}
}
@media(max-width:400px){
  .login-mob-inner{padding:24px 18px 36px!important}
  .login-title-sm{font-size:19px!important}
}
`;

function Icon({name,size=18}){
  const d={width:size,height:size};
  const icons={
    logout:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    plus:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    cal:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    chart:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    cog:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/></svg>,
    dl:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    edit:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    check:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
    link:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    x:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    user:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    lock:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    eye:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    hist:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>,
    bell:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    home:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    warn:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    cL:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15,18 9,12 15,6"/></svg>,
    cR:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>,
    menu:<svg {...d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  };
  return icons[name]||null;
}

function CalPicker({value,onChange,label}){
  const [open,setOpen]=useState(false);
  const [vd,setVd]=useState(()=>value?new Date(value+"T00:00:00"):new Date());
  const ref=useRef();
  const y=vd.getFullYear(),m=vd.getMonth();
  const fd=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate(),pd=new Date(y,m,0).getDate();
  const cells=[];
  for(let i=fd-1;i>=0;i--) cells.push({d:pd-i,cur:false});
  for(let d=1;d<=dim;d++) cells.push({d,cur:true});
  while(cells.length<42) cells.push({d:cells.length-fd-dim+1,cur:false});
  const ts=todayStr();
  const disp=value?(([yr,mo,dy])=>`${dy} ${MI[parseInt(mo)-1]} ${yr}`)(value.split("-")):"Pilih tanggal";
  return(
    <div ref={ref} style={{position:"relative"}}>
      {label&&<label className="lbl">{label}</label>}
      <button onClick={()=>setOpen(!open)} style={{background:"#0A0B10",border:`1px solid ${open?"#6366f1":"#1A1F2E"}`,color:value?"#e2e8f0":"#475569",padding:"10px 13px",borderRadius:10,cursor:"pointer",fontSize:13.5,display:"flex",alignItems:"center",gap:8,width:"100%",fontFamily:"inherit",whiteSpace:"nowrap"}}>
        <Icon name="cal" size={14}/> {disp}
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:9999,background:"#0D0F18",border:"1px solid #151c28",borderRadius:13,padding:14,minWidth:268,boxShadow:"0 24px 60px rgba(0,0,0,.85)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <button onClick={()=>setVd(new Date(y,m-1,1))} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",padding:"4px 6px",display:"flex"}}><Icon name="cL" size={14}/></button>
            <span style={{fontWeight:700,fontSize:13,color:"#e2e8f0"}}>{MI[m]} {y}</span>
            <button onClick={()=>setVd(new Date(y,m+1,1))} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",padding:"4px 6px",display:"flex"}}><Icon name="cR" size={14}/></button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
            {DI.map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:"#334155"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {cells.map((cell,i)=>{
              const ds=cell.cur?`${y}-${String(m+1).padStart(2,"0")}-${String(cell.d).padStart(2,"0")}`:"";
              const isSel=ds===value,isToday=ds===ts;
              return(<button key={i} onClick={()=>cell.cur&&(onChange(ds),setOpen(false))} disabled={!cell.cur}
                style={{padding:"6px 2px",borderRadius:6,border:"none",cursor:cell.cur?"pointer":"default",fontSize:11.5,fontWeight:isSel?700:400,background:isSel?"linear-gradient(135deg,#6366f1,#7c3aed)":isToday?"#1a1a2e":"transparent",color:isSel?"white":isToday?"#818cf8":cell.cur?"#e2e8f0":"#252d3d"}}>
                {cell.d}</button>);
            })}
          </div>
          <button onClick={()=>{const n=new Date();onChange(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`);setOpen(false);}}
            style={{marginTop:9,width:"100%",background:"#161b27",border:"none",color:"#94a3b8",padding:"6px",borderRadius:7,cursor:"pointer",fontSize:11.5,fontFamily:"inherit"}}>Hari Ini</button>
        </div>
      )}
    </div>
  );
}

function EditModal({post,data,onSave,onClose}){
  const [f,setF]=useState({...post});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <div className="ov" onClick={onClose}>
      <div className="mod" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15}}>✏️ Edit Laporan</div>
          <button style={{background:"none",border:"none",color:"#64748b",cursor:"pointer"}} onClick={onClose}><Icon name="x" size={18}/></button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:13}}>
          <CalPicker value={f.date} onChange={v=>set("date",v)} label="📅 Tanggal Posting"/>
          <div className="g2">
            <div><label className="lbl">👤 Pembuat</label><select value={f.creator} onChange={e=>set("creator",e.target.value)} className="inp">{(data.creators||[]).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="lbl">📱 Akun</label><select value={f.account} onChange={e=>set("account",e.target.value)} className="inp">{(data.accounts||[]).map(a=><option key={a} value={a}>{a}</option>)}</select></div>
          </div>
          <div className="g2">
            <div><label className="lbl">🎨 Tema</label><select value={f.theme} onChange={e=>set("theme",e.target.value)} className="inp">{(data.themes||[]).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="lbl">📌 Status</label><select value={f.status||""} onChange={e=>set("status",e.target.value)} className="inp"><option value="">-- Pilih --</option><option value="Draft">📝 Draft</option><option value="Scheduled">🗓️ Scheduled</option><option value="Posted">✅ Posted</option></select></div>
          </div>
          <div><label className="lbl">🔗 Link</label><input type="url" value={f.link} onChange={e=>set("link",e.target.value)} className="inp" placeholder="https://www.instagram.com/p/..."/></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn-p" style={{flex:1}} onClick={()=>onSave(f)}><Icon name="check" size={14}/> Simpan</button>
            <button className="btn-s" onClick={onClose}>Batal</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({title,emoji,k,items,nv,setNv,ed,setEd,onAdd,onDel,onSaveEdit}){
  return(
    <div className="card" style={{marginBottom:14}}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13.5,color:"#F1F5F9",marginBottom:13}}>{emoji} {title}</div>
      <div style={{display:"flex",gap:8,marginBottom:11}}>
        <input value={nv} onChange={e=>setNv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onAdd(k,nv,setNv)} placeholder={`Tambah ${title.toLowerCase()}...`} className="inp" style={{flex:1}}/>
        <button className="btn-p" style={{padding:"8px 14px"}} onClick={()=>onAdd(k,nv,setNv)}><Icon name="plus" size={13}/> Tambah</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {items.map(item=>(
          <div key={item} style={{display:"flex",alignItems:"center",gap:7,background:"#0A0B10",padding:"8px 11px",borderRadius:9,border:"1px solid #151c28"}}>
            {ed?.old===item?(
              <><input value={ed.val} onChange={e=>setEd({...ed,val:e.target.value})} className="inp" style={{flex:1,padding:"6px 10px"}} autoFocus/>
              <button className="btn-p" style={{padding:"6px 10px"}} onClick={()=>onSaveEdit(k,item,ed.val,setEd)}><Icon name="check" size={12}/></button>
              <button className="btn-s" style={{padding:"6px 9px"}} onClick={()=>setEd(null)}><Icon name="x" size={12}/></button></>
            ):(
              <><span style={{flex:1,fontSize:13.5,fontWeight:500}}>{item}</span>
              <button className="btn-s" style={{padding:"6px 9px"}} onClick={()=>setEd({old:item,val:item})}><Icon name="edit" size={12}/></button>
              <button className="btn-d" style={{padding:"5px 9px"}} onClick={()=>onDel(k,item)}><Icon name="trash" size={11}/></button></>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotifBadge({data, freelancerNames}){
  const td=todayStr();
  const names = freelancerNames && freelancerNames.length > 0 ? freelancerNames : (data.creators||[]);
  const missing=names.filter(cr=>!(data.posts||[]).some(p=>p.date===td&&p.creator===cr));
  if(!missing.length) return null;
  return <span style={{background:"#ef4444",color:"white",borderRadius:999,fontSize:9,fontWeight:700,padding:"1px 6px",marginLeft:"auto"}}>{missing.length}</span>;
}

function Spinner({text="Memuat..."}){
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0A0B10",flexDirection:"column",gap:14}}>
      <div style={{width:38,height:38,border:"2.5px solid #1A1F2E",borderTop:"2.5px solid #F59E0B",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
      <div style={{color:"#475569",fontSize:13,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{text}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [data,setData]=useState(null);
  const [authUser,setAuthUser]=useState(null);
  const [role,setRole]=useState(null);
  const [loggedUsername,setLoggedUsername]=useState("");
  const [appLoading,setAppLoading]=useState(true);
  const [page,setPage]=useState("home");
  const [sideOpen,setSideOpen]=useState(false);
  const [toast,setToast]=useState(null);
  const [csvModal,setCsvModal]=useState(null);
  const [resetMode,setResetMode]=useState(false);
  // State users live — supaya Dashboard, Pengaturan, dsb ikut update real-time
  const [liveUsers,setLiveUsers]=useState(()=>loadUsers());

  useEffect(()=>{
    if(window.location.hash.includes("type=recovery")){setResetMode(true);setAppLoading(false);return;}
    if(supabase){
      supabase.auth.getSession().then(({data:{session}})=>{
        if(session?.user){
          const r=getRoleFromEmail(session.user.email);
          setAuthUser(session.user);setRole(r);setPage(r==="admin"?"home":"input");
        } else {
          try{const s=localStorage.getItem(SESSION_KEY);if(s){const{role:r,username:u}=JSON.parse(s);setRole(r);if(u)setLoggedUsername(u);setPage(r==="admin"?"home":"input");}}catch{}
        }
        setAppLoading(false);
      });
      const {data:{subscription}}=supabase.auth.onAuthStateChange((_ev,session)=>{
        if(session?.user){const r=getRoleFromEmail(session.user.email);setAuthUser(session.user);setRole(r);setPage(r==="admin"?"home":"input");}
      });
      return()=>subscription.unsubscribe();
    } else {
      try{const s=localStorage.getItem(SESSION_KEY);if(s){const{role:r,username:u}=JSON.parse(s);setRole(r);if(u)setLoggedUsername(u);setPage(r==="admin"?"home":"input");}}catch{}
      setAppLoading(false);
    }
  },[]);

  useEffect(()=>{
    if(role===null) return;
    async function load(){
      try{
        if(supabase){
          const{data:row,error}=await supabase.from("naraya_settings").select("content").eq("id",1).single();
          if(!error&&row?.content){setData(row.content);return;}
        }
        const local=localStorage.getItem(STORAGE_KEY);
        setData(local?JSON.parse(local):{...DD});
      }catch{setData({...DD});}
    }
    // Juga refresh liveUsers dari DB saat login
    async function loadU(){
      const u = await loadUsersFromDB();
      setLiveUsers({...u});
    }
    load();
    loadU();
  },[role]);

  useEffect(()=>{
    if(!data) return;
    const t=setTimeout(async()=>{
      try{
        localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
        if(supabase) await supabase.from("naraya_settings").upsert({id:1,content:data},{onConflict:"id"});
      }catch{}
    },800);
    return()=>clearTimeout(t);
  },[data]);

  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};
  const updData=fn=>setData(p=>fn(p));
  const editPost=(id,upd)=>updData(d=>({...d,posts:d.posts.map(p=>p.id===id?{...p,...upd}:p)}));
  const delPost=id=>updData(d=>({...d,posts:d.posts.filter(p=>p.id!==id)}));
  const addPost=post=>updData(d=>({...d,posts:[post,...d.posts]}));
  const doLogout=async()=>{
    if(supabase&&authUser) await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    setRole(null);setAuthUser(null);setData(null);
  };

  if(appLoading) return <Spinner text="Menghubungkan..."/>;
  if(resetMode)  return <ResetPasswordPage onDone={()=>setResetMode(false)}/>;
  if(!role) return(
    <LoginPage
      onLogin={(r,uname)=>{localStorage.setItem(SESSION_KEY,JSON.stringify({role:r,username:uname}));setRole(r);setLoggedUsername(uname);setPage(r==="admin"?"home":"input");}}
      onLoginSupabase={(r,user)=>{setAuthUser(user);setRole(r);const uname=user.user_metadata?.username||user.user_metadata?.full_name||user.email?.split("@")[0]||"";setLoggedUsername(uname);setPage(r==="admin"?"home":"input");}}
    />
  );
  if(!data) return <Spinner text="Memuat data..."/>;

  const adminNav=[{id:"home",label:"Dashboard",icon:"home"},{id:"input",label:"Input Laporan",icon:"plus"},{id:"calendar",label:"Kalender Konten",icon:"cal"},{id:"productivity",label:"Produktivitas",icon:"chart"},{id:"settings",label:"Pengaturan",icon:"cog"},{id:"history",label:"History",icon:"hist"},{id:"users",label:"Kelola User",icon:"user"}];
  const freelancerNav=[{id:"input",label:"Input Laporan",icon:"plus"},{id:"calendar",label:"Kalender Konten",icon:"cal"}];
  const nav=role==="admin"?adminNav:freelancerNav;

  // Nama-nama freelancer dari Kelola User → sumber tunggal untuk Dashboard & Pengaturan
  const freelancerNames = Object.entries(liveUsers)
    .filter(([,v])=>v.role==="freelancer")
    .map(([,v])=>v.name||"")
    .filter(Boolean);

  // Normalize data — pastikan semua array ada walau data dari localStorage tidak lengkap
  const safeData = {
    posts:         Array.isArray(data.posts)    ? data.posts    : [],
    monthlyTarget: data.monthlyTarget           || 1500,
    creators:      freelancerNames.length > 0 ? freelancerNames : (Array.isArray(data.creators) ? data.creators : ["Arya","Darul","Revi","Vika","Nessa","Khaira"]),
    accounts:      Array.isArray(data.accounts) ? data.accounts : ["WiFicerdas","NarayaConnect","Curhat.santui","SobatNgadu","Mbokdewor","GA.naratelgroup"],
    themes:        Array.isArray(data.themes)   ? data.themes   : ["Edukasi","Promosi","Hiburan","Informasi","Tutorial","Motivasi","Lifestyle","Review"],
  };
  const props={data:safeData,updData,editPost,delPost,addPost,showToast,setCsvModal,setPage,role,loggedUsername,liveUsers,setLiveUsers,freelancerNames};

  const uname = loggedUsername||authUser?.email?.split("@")[0]||(role==="admin"?"Admin":"Freelancer");
  const uInitial = uname.charAt(0).toUpperCase();

  return(
    <div style={{minHeight:"100vh",background:"#0A0B10",color:"#cbd5e1",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif"}}>
      <style>{GCSS}</style>

      {/* ── BODY: sidebar + main ── */}
      <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
        {sideOpen&&<div className="mob-overlay" onClick={()=>setSideOpen(false)}/>}

        {/* Sidebar — collapsed by default, expands on hover */}
        <div className={`sidebar-wrap${sideOpen?" open":""}`}>
          {/* Logo */}
          <div style={{padding:"6px 6px 14px",borderBottom:"1px solid #1A1F2E",marginBottom:8,flexShrink:0,overflow:"hidden"}}>
            <div className="sidebar-logo-text">
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:8.5,fontWeight:500,color:"#475569",letterSpacing:".2em",textTransform:"uppercase",marginBottom:5}}>Welcome to</div>
              <div style={{display:"flex",alignItems:"center",gap:0,lineHeight:1,marginBottom:6,whiteSpace:"nowrap"}}>
                <span style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:800,color:"#F1F5F9",letterSpacing:"-0.8px"}}>Naraya</span>
                <span style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:800,color:"#F59E0B",letterSpacing:"-0.8px",marginLeft:6}}>One</span>
              </div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:7.5,fontWeight:700,color:"#7C3AED",letterSpacing:".14em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Content Management Tracker System</div>
            </div>
            {/* Icon only when collapsed */}
            <div className="sidebar-icon-only" style={{width:32,height:32,background:"linear-gradient(135deg,#F59E0B,#F97316)",borderRadius:9,display:"none",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"white"}}>N</div>
          </div>
          {/* Nav */}
          <nav style={{flex:1,display:"flex",flexDirection:"column",gap:2,overflow:"hidden"}}>
            {nav.map(n=>(
              <button key={n.id} className={`nav-btn${page===n.id?" active":""}`} onClick={()=>{setPage(n.id);setSideOpen(false);}}>
                <span style={{flexShrink:0,display:"flex"}}><Icon name={n.icon} size={16}/></span>
                <span className="sidebar-label">{n.label}</span>
                {n.id==="home"&&role==="admin"&&<NotifBadge data={safeData} freelancerNames={freelancerNames}/>}
              </button>
            ))}
          </nav>
          {/* User / logout */}
          <div style={{borderTop:"1px solid #1A1F2E",paddingTop:10,marginTop:6,overflow:"hidden"}}>
            <button className="nav-btn" onClick={doLogout} style={{overflow:"hidden"}}>
              <span style={{flexShrink:0,display:"flex"}}><Icon name="logout" size={16}/></span>
              <span className="sidebar-user-text" style={{display:"flex",flexDirection:"column",gap:1}}>
                <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>{uname}</span>
                <span style={{fontSize:10,color:"#334155"}}>{role==="admin"?"👑 Admin":"🧑 Freelancer"} · Keluar</span>
              </span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
          <main className="main-pad" style={{flex:1,overflow:"auto",padding:"24px 28px"}}>
            {page==="home"&&role==="admin"&&<DashboardPage {...props}/>}
            {page==="input"&&<InputPage {...props}/>}
            {page==="calendar"&&<CalendarPage {...props}/>}
            {page==="productivity"&&<ProductivityPage {...props}/>}
            {page==="settings"&&role==="admin"&&<SettingsPage {...props}/>}
            {page==="history"&&<HistoryPage {...props}/>}
            {page==="users"&&role==="admin"&&<UsersPage showToast={showToast} setLiveUsers={setLiveUsers}/>}
          </main>
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast&&(
        <div className="toast" style={{background:toast.type==="err"?"#1f0808":"#031a0e",border:`1px solid ${toast.type==="err"?"#5c1a1a":"#0a4a28"}`,color:toast.type==="err"?"#fca5a5":"#6ee7b7"}}>
          <Icon name={toast.type==="err"?"x":"check"} size={14}/> {toast.msg}
        </div>
      )}

      {/* ── CSV MODAL ── */}
      {csvModal&&(
        <div className="ov" onClick={()=>setCsvModal(null)}>
          <div className="mod" style={{maxWidth:640}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:"#F1F5F9"}}>📄 Export Data</div>
              <button style={{background:"none",border:"none",color:"#64748b",cursor:"pointer"}} onClick={()=>setCsvModal(null)}><Icon name="x" size={18}/></button>
            </div>
            <div style={{fontSize:12,color:"#475569",marginBottom:10}}>Salin teks di bawah → simpan sebagai <strong style={{color:"#F59E0B"}}>.csv</strong></div>
            <textarea readOnly value={csvModal} onClick={e=>e.target.select()} style={{width:"100%",height:260,background:"#0A0B10",border:"1px solid #1A1F2E",color:"#94a3b8",padding:"11px",borderRadius:10,fontSize:11,fontFamily:"monospace",resize:"vertical",outline:"none",lineHeight:1.6}}/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button className="btn-p" onClick={()=>navigator.clipboard?.writeText(csvModal).then(()=>{showToast("Disalin! 📋");setCsvModal(null);})}><Icon name="check" size={13}/> Salin ke Clipboard</button>
              <button className="btn-s" onClick={()=>setCsvModal(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
function ResetPasswordPage({onDone}){
  const [np,setNp]=useState(""); const [cp,setCp]=useState("");
  const [sp,setSp]=useState(false); const [sp2,setSp2]=useState(false);
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false); const [ok,setOk]=useState(false);
  const submit=async()=>{
    setErr("");
    if(np.length<6) return setErr("Password minimal 6 karakter.");
    if(np!==cp) return setErr("Konfirmasi password tidak cocok.");
    setBusy(true);
    try{
      if(supabase){const{error}=await supabase.auth.updateUser({password:np});if(error)throw error;}
      setOk(true); setTimeout(()=>onDone(),2500);
    }catch(e){setErr(e.message||"Gagal update password.");}
    finally{setBusy(false);}
  };
  const iS={width:"100%",background:"#0A0B10",border:"1px solid #151c28",color:"#e2e8f0",padding:"11px 40px",borderRadius:11,fontSize:14,outline:"none",fontFamily:"inherit"};
  const iL={position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#1e2a3a"};
  const iR={position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#1e2a3a",display:"flex"};
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0A0B10"}}>
      <div style={{width:"100%",maxWidth:400,background:"#0D0F18",border:"1px solid #0d1018",borderRadius:20,padding:"36px 32px"}}>
        {ok?(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>🎉</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:18,color:"#f1f5f9",marginBottom:8}}>Password Berhasil Diubah!</div>
            <p style={{color:"#64748b",fontSize:13}}>Mengalihkan ke halaman login...</p>
          </div>
        ):(
          <>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:8}}>🔐</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:18,color:"#f1f5f9",marginBottom:4}}>Buat Password Baru</div>
              <div style={{color:"#475569",fontSize:12.5}}>Masukkan password baru kamu</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={{fontSize:10.5,fontWeight:700,color:"#334155",textTransform:"uppercase",letterSpacing:".1em",display:"block",marginBottom:6}}>Password Baru</label>
                <div style={{position:"relative"}}><span style={iL}><Icon name="lock" size={15}/></span>
                  <input type={sp?"text":"password"} value={np} onChange={e=>setNp(e.target.value)} placeholder="Min. 6 karakter" style={iS}/>
                  <button onClick={()=>setSp(!sp)} style={iR}><Icon name={sp?"eyeOff":"eye"} size={14}/></button></div></div>
              <div><label style={{fontSize:10.5,fontWeight:700,color:"#334155",textTransform:"uppercase",letterSpacing:".1em",display:"block",marginBottom:6}}>Konfirmasi Password</label>
                <div style={{position:"relative"}}><span style={iL}><Icon name="lock" size={15}/></span>
                  <input type={sp2?"text":"password"} value={cp} onChange={e=>setCp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Ulangi password" style={{...iS,borderColor:cp&&np!==cp?"#ef4444":undefined}}/>
                  <button onClick={()=>setSp2(!sp2)} style={iR}><Icon name={sp2?"eyeOff":"eye"} size={14}/></button></div>
                {cp&&np!==cp&&<div style={{color:"#f87171",fontSize:11.5,marginTop:4}}>Password tidak cocok</div>}</div>
              {err&&<div style={{color:"#fca5a5",fontSize:12.5,padding:"10px 13px",background:"#1f0808",borderRadius:9,border:"1px solid #5c1a1a"}}>{err}</div>}
              <button onClick={submit} disabled={busy} style={{width:"100%",background:busy?"#1e2235":"linear-gradient(135deg,#6366f1,#7c3aed)",color:"white",border:"none",padding:"13px",borderRadius:12,cursor:busy?"not-allowed":"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit",opacity:busy?0.7:1}}>
                {busy?"Menyimpan...":"Simpan Password Baru →"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({onLogin,onLoginSupabase}){
  const [username,setUsername]=useState("");
  const [p,setP]=useState("");
  const [sp,setSp]=useState(false);
  const [loginErr,setLoginErr]=useState("");
  const [lBusy,setLBusy]=useState(false);
  // Lupa password state
  const [showForgot,setShowForgot]=useState(false);
  const [fEmail,setFEmail]=useState("");
  const [fSent,setFSent]=useState(false);
  const [fErr,setFErr]=useState("");
  const [fBusy,setFBusy]=useState(false);

  const iS={width:"100%",background:"#0A0B10",border:"1px solid #0d1018",color:"#e2e8f0",padding:"11px 40px",borderRadius:11,fontSize:14,outline:"none",outlineOffset:0,fontFamily:"inherit",transition:"border-color .18s",boxSizing:"border-box",display:"block"};
  const iL={position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#334155"};
  const iR={position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#334155",display:"flex"};
  const lS={fontSize:10.5,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:".1em",display:"block",marginBottom:6};

  // Login: baca users dari Supabase/localStorage (selalu fresh)
  const doLogin=async()=>{
    setLoginErr(""); setLBusy(true);
    const uname = username.trim().toLowerCase();
    const pwd   = p;
    try{
      // 1. Baca users terbaru dari Supabase/localStorage
      const currentUsers = await loadUsersFromDB();
      const found = currentUsers[uname];
      if(found){
        if(found.pass === pwd){
          onLogin(found.role, username.trim());
          return;
        } else {
          throw new Error("Username atau password salah.");
        }
      }
      // 2. Kalau tidak ada → coba Supabase Auth (untuk email asli)
      if(supabase){
        const{data:d,error}=await supabase.auth.signInWithPassword({email:uname,password:pwd});
        if(error){
          const msg=error.message||"";
          if(msg.includes("Invalid login credentials")||msg.includes("invalid_credentials"))
            throw new Error("Username atau password salah.");
          throw new Error(msg||"Login gagal.");
        }
        const r=getRoleFromEmail(d.user.email);
        onLoginSupabase(r,d.user);
      } else {
        throw new Error("Username atau password salah.");
      }
    }catch(e){ setLoginErr(e.message||"Login gagal."); }
    finally{ setLBusy(false); }
  };

  const doForgot=async()=>{
    setFErr("");
    if(!fEmail.trim()) return setFErr("Masukkan email kamu.");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail.trim())) return setFErr("Format email tidak valid.");
    setFBusy(true);
    try{
      if(supabase){
        const redirectUrl=window.location.href.split("#")[0].split("?")[0];
        const{error}=await supabase.auth.resetPasswordForEmail(fEmail.trim(),{redirectTo:redirectUrl});
        if(error) throw error;
      }
      setFSent(true);
    }catch(e){ setFErr(e.message||"Gagal kirim email."); }
    finally{ setFBusy(false); }
  };

  const loginCardBg = "#0D0F18";
  const loginInputStyle = {width:"100%",background:"#0A0B10",border:"1px solid #1A1F2E",color:"#e2e8f0",padding:"10px 13px 10px 40px",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",transition:"border-color .18s",boxSizing:"border-box"};

  return(
    <div style={{height:"100vh",maxHeight:"100vh",display:"flex",background:"#0A0B10",position:"relative",overflow:"hidden",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif"}}>
      {/* Ambient glow */}
      <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,0.07),transparent 65%)",top:"-100px",left:"-80px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(249,115,22,0.06),transparent 65%)",bottom:"-80px",right:"60px",pointerEvents:"none"}}/>

      {/* ── LEFT PANEL (desktop only) ── */}
      <div className="desk-only" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 72px",position:"relative"}}>
        {/* Decorative grid lines */}
        <div style={{position:"absolute",inset:0,opacity:0.03,backgroundImage:"linear-gradient(#F59E0B 1px,transparent 1px),linear-gradient(90deg,#F59E0B 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none"}}/>
        <div style={{position:"relative",maxWidth:460}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#1A1408",border:"1px solid #2d2006",borderRadius:8,padding:"5px 12px",marginBottom:20}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B"}}/>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:".14em",color:"#F59E0B",textTransform:"uppercase"}}>Content Management Tracker</span>
          </div>
          <div style={{lineHeight:1.0,marginBottom:10}}>
            <span style={{fontFamily:"'Sora',sans-serif",fontSize:52,fontWeight:800,color:"#F1F5F9",letterSpacing:"-2px"}}>Naraya </span>
            <span style={{fontFamily:"'Sora',sans-serif",fontSize:52,fontWeight:800,color:"#F59E0B",letterSpacing:"-2px"}}>One</span>
          </div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,fontWeight:500,color:"#7C3AED",letterSpacing:".18em",textTransform:"uppercase",marginBottom:16}}>Content Management Tracker System</div>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:300,color:"#475569",lineHeight:1.7,marginBottom:36,maxWidth:340}}>Platform pelaporan dan pelacakan konten untuk tim freelancer Naraya Group.</div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {[["📱","6 Akun aktif"],["👥","6 Kreator"],["📊","Analytics real-time"],["🎯","Target bulanan"]].map(([ic,lbl])=>(
              <div key={lbl} style={{display:"flex",alignItems:"center",gap:8,background:"#0D0F18",border:"1px solid #1A1F2E",borderRadius:10,padding:"8px 14px"}}>
                <span style={{fontSize:16}}>{ic}</span>
                <span style={{fontSize:12,color:"#64748B",fontWeight:600}}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div className="login-right-panel" style={{width:"100%",maxWidth:420,background:loginCardBg,borderLeft:"1px solid #1A1F2E",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"clamp(20px,5vw,40px) clamp(16px,5vw,32px)",overflow:"hidden",height:"100vh",boxSizing:"border-box",flexShrink:0}}>
        <div className="login-mob-inner" style={{width:"100%",boxSizing:"border-box"}}>

          {/* Logo mark */}
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,fontWeight:500,color:"#475569",letterSpacing:".2em",textTransform:"uppercase",marginBottom:8}}>Welcome to</div>
            <div style={{display:"flex",alignItems:"center",gap:0,lineHeight:1,marginBottom:8}}>
              <span style={{fontFamily:"'Sora',sans-serif",fontSize:30,fontWeight:800,color:"#F1F5F9",letterSpacing:"-1px"}}>Naraya</span>
              <span style={{fontFamily:"'Sora',sans-serif",fontSize:30,fontWeight:800,color:"#F59E0B",letterSpacing:"-1px",marginLeft:8}}>One</span>
            </div>
            <div style={{fontFamily:"'Sora',sans-serif",fontSize:9,fontWeight:700,color:"#7C3AED",letterSpacing:".14em",textTransform:"uppercase"}}>Content Management Tracker System</div>
          </div>

          {showForgot?(
            fSent?(
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:40,marginBottom:10}}>📬</div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:"#f1f5f9",marginBottom:8}}>Email Terkirim!</div>
                <p style={{fontSize:12.5,color:"#64748b",lineHeight:1.7,marginBottom:6}}>Link reset dikirim ke:</p>
                <p style={{fontSize:13,fontWeight:700,color:"#F59E0B",marginBottom:14}}>{fEmail}</p>
                <div style={{background:"#0A0B10",border:"1px solid #1A1F2E",borderRadius:10,padding:"11px 14px",fontSize:12,color:"#94a3b8",lineHeight:1.9,marginBottom:14,textAlign:"left"}}>
                  <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:6}}>Langkah selanjutnya:</div>
                  <div>1. Buka inbox email kamu</div>
                  <div>2. Klik link <strong style={{color:"#F59E0B"}}>Reset Password</strong></div>
                  <div>3. Isi password baru</div>
                  <div>4. Login kembali</div>
                </div>
                <button onClick={()=>{setShowForgot(false);setFSent(false);setFEmail("");}} style={{background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"white",border:"none",padding:"10px 22px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>← Kembali ke Login</button>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{marginBottom:4}}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:"#f1f5f9",marginBottom:3}}>Lupa Password 🔐</div>
                  <div style={{fontSize:12,color:"#475569"}}>Masukkan email pribadi yang terdaftar</div>
                </div>
                <div>
                  <label style={lS}>Email Pribadi</label>
                  <div style={{position:"relative"}}>
                    <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#334155"}}><Icon name="user" size={15}/></span>
                    <input type="email" value={fEmail} onChange={e=>setFEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doForgot()} placeholder="email@kamu.com" style={loginInputStyle}/>
                  </div>
                  <div style={{fontSize:11,color:"#334155",marginTop:5}}>Link reset akan dikirim ke email ini</div>
                </div>
                {fErr&&<div style={{color:"#fca5a5",fontSize:12.5,padding:"10px 13px",background:"#1f0808",borderRadius:9,border:"1px solid #5c1a1a"}}>{fErr}</div>}
                <button onClick={doForgot} disabled={fBusy} style={{width:"100%",background:fBusy?"#1A1F2E":"linear-gradient(135deg,#F59E0B,#F97316)",color:"white",border:"none",padding:"12px",borderRadius:12,cursor:fBusy?"not-allowed":"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit",opacity:fBusy?0.7:1}}>{fBusy?"Mengirim...":"📨 Kirim Link Reset"}</button>
                <div style={{textAlign:"center"}}><button onClick={()=>{setShowForgot(false);setFErr("");}} style={{background:"none",border:"none",color:"#475569",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← Kembali ke Login</button></div>
              </div>
            )
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:15}}>
              <div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:"#F1F5F9",marginBottom:3}}>Selamat Datang!</div>
                <div style={{fontSize:12,color:"#475569"}}>Masukkan kredensial akun kamu</div>
              </div>

              {/* Username */}
              <div>
                <label style={lS}>Username</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#334155"}}><Icon name="user" size={15}/></span>
                  <input type="text" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan username" style={loginInputStyle} autoComplete="username"/>
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={lS}>Password</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#334155"}}><Icon name="lock" size={15}/></span>
                  <input type={sp?"text":"password"} value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Masukkan password" style={loginInputStyle} autoComplete="current-password"/>
                  <button onClick={()=>setSp(!sp)} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#334155",display:"flex"}}><Icon name={sp?"eyeOff":"eye"} size={14}/></button>
                </div>
              </div>

              {loginErr&&<div style={{color:"#fca5a5",fontSize:12.5,padding:"10px 13px",background:"#1f0808",borderRadius:9,border:"1px solid #5c1a1a",display:"flex",alignItems:"center",gap:7}}><Icon name="warn" size={13}/>{loginErr}</div>}

              <button onClick={doLogin} disabled={lBusy} style={{width:"100%",background:lBusy?"#1A1F2E":"linear-gradient(135deg,#F59E0B,#F97316)",color:"white",border:"none",padding:"13px",borderRadius:12,cursor:lBusy?"not-allowed":"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit",opacity:lBusy?0.7:1,transition:"all .18s",marginTop:2}}>
                {lBusy?"Masuk...":"Masuk →"}
              </button>

              <div style={{textAlign:"center"}}>
                <button onClick={()=>{setShowForgot(true);setLoginErr("");}} style={{background:"none",border:"none",color:"#475569",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  Lupa password? <span style={{color:"#F59E0B",fontWeight:600}}>Reset di sini</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ data, updData, showToast, setPage, freelancerNames }) {
  const now = new Date();
  const ms = monthStr(now);
  const td = todayStr();
  const thisMonth = (data.posts||[]).filter(p => p.date.startsWith(ms));
  const posted = thisMonth.filter(p => p.status === "Posted");
  const target = data.monthlyTarget || 1500;
  const pct = Math.min(100, Math.round((thisMonth.length / target) * 100));
  const bc = pct >= 100 ? "#10b981" : pct >= 75 ? "#6366f1" : pct >= 50 ? "#f59e0b" : "#f43f5e";
  const [editTgt, setEditTgt] = useState(false);
  const [tgtIn, setTgtIn] = useState(String(target));

  // Gunakan freelancerNames dari Kelola User sebagai sumber utama
  const creatorList = freelancerNames && freelancerNames.length > 0 ? freelancerNames : (data.creators||[]);

  const noToday = creatorList.filter(cr => !(data.posts||[]).some(p => p.creator === cr && p.date === td));
  const debtPosts = (data.posts||[]).filter(p => p.status === "Scheduled" && p.date < td);

  const creatorStats = useMemo(() => creatorList.map(cr => {
    const cnt = posted.filter(p => p.creator === cr).length;
    const todayDone = (data.posts||[]).some(p => p.creator === cr && p.date === td && p.status === "Posted");
    const last = (data.posts||[]).filter(p => p.creator === cr && p.status === "Posted").sort((a,b) => b.date.localeCompare(a.date))[0];
    const days = last ? Math.floor((new Date(td) - new Date(last.date)) / 86400000) : null;
    return { cr, cnt, todayDone, days };
  }).sort((a,b) => b.cnt - a.cnt), [data, td, posted, creatorList]);

  const accDist = useMemo(() => {
    const maxV = Math.max(...(data.accounts||[]).map(a => posted.filter(p => p.account === a).length), 1);
    return (data.accounts||[]).map(acc => ({ acc, cnt: posted.filter(p => p.account === acc).length, maxV }))
      .sort((a,b) => b.cnt - a.cnt);
  }, [data, posted]);

  return (
    <div>
      {/* PAGE HEADER */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview tim — {MI[now.getMonth()]} {now.getFullYear()}</p>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {(noToday.length > 0 || debtPosts.length > 0) && (
        <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:18 }}>
          {noToday.length > 0 && (
            <div style={{ background:"#1a0a00", border:"1px solid #F9731633", borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"flex-start", gap:11 }}>
              <div style={{ color:"#f97316", flexShrink:0, marginTop:1 }}><Icon name="warn" size={17}/></div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fb923c", marginBottom:5 }}>⚠️ {noToday.length} Kreator belum posting hari ini</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {noToday.map(cr => <span key={cr} style={{ background:(CC[cr]||"#6366f1")+"22", color:CC[cr]||"#818cf8", padding:"2px 10px", borderRadius:999, fontSize:11.5, fontWeight:600 }}>{cr}</span>)}
                </div>
              </div>
            </div>
          )}
          {debtPosts.length > 0 && (
            <div style={{ background:"#0c0a1a", border:"1px solid #6366f133", borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"flex-start", gap:11 }}>
              <div style={{ flexShrink:0, marginTop:1 }}><Icon name="bell" size={17}/></div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#a78bfa", marginBottom:4 }}>🗓️ {debtPosts.length} konten Scheduled melewati tanggal</div>
                <div style={{ fontSize:12, color:"#475569" }}>Segera follow up tim untuk menyelesaikan hutang konten.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAT CARDS — new accent-bar style */}
      <div className="sgrid" style={{ marginBottom:18 }}>
        {[
          ["TOTAL BULAN INI", thisMonth.length,                                          "blue",   "#3B82F6"],
          ["✅ POSTED",       posted.length,                                              "green",  "#10B981"],
          ["🗓️ SCHEDULED",   thisMonth.filter(p => p.status === "Scheduled").length,    "blue",   "#60A5FA"],
          ["📝 DRAFT",        thisMonth.filter(p => p.status === "Draft").length,         "amber",  "#F59E0B"],
        ].map(([l, v, cls, c]) => (
          <div key={l} className={`stat-card ${cls}`}>
            <div style={{ fontSize:9, color:"#475569", fontWeight:700, letterSpacing:".1em", marginBottom:8, textTransform:"uppercase" }}>{l}</div>
            <div style={{ fontSize:30, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", color:c, letterSpacing:"-1px", lineHeight:1 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* TARGET */}
      <div className="stat-card amber" style={{ marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontSize:9.5, color:"#475569", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginBottom:5 }}>🎯 Progress Target {MI[now.getMonth()]} {now.getFullYear()}</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700, color:bc, letterSpacing:"-1px" }}>{thisMonth.length.toLocaleString()}</span>
              <span style={{ fontSize:13, color:"#475569" }}>/ {target.toLocaleString()} video</span>
              <span style={{ fontSize:20, fontWeight:700, color:bc }}>{pct}%</span>
              {pct >= 100 && <span>🏆</span>}
            </div>
          </div>
          {editTgt ? (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <input type="number" value={tgtIn} onChange={e => setTgtIn(e.target.value)} className="inp" style={{ width:100, padding:"6px 10px", fontSize:13 }}/>
              <button className="btn-p" style={{ padding:"6px 11px" }} onClick={() => { const v = parseInt(tgtIn); if (v > 0) { updData(d => ({ ...d, monthlyTarget:v })); showToast("Target diperbarui! 🎯"); } setEditTgt(false); }}><Icon name="check" size={13}/></button>
              <button className="btn-s" style={{ padding:"6px 10px" }} onClick={() => setEditTgt(false)}><Icon name="x" size={13}/></button>
            </div>
          ) : (
            <button className="btn-s" style={{ padding:"6px 12px", fontSize:12 }} onClick={() => { setTgtIn(String(target)); setEditTgt(true); }}><Icon name="edit" size={12}/> Set Target</button>
          )}
        </div>
        <div style={{ height:10, background:"#1A1F2E", borderRadius:999, overflow:"hidden", marginBottom:7 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${bc},${bc}bb)`, borderRadius:999, transition:"width .8s ease" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
          <span style={{color:"#F59E0B",fontWeight:600}}>{pct >= 100 ? "🎉 Target tercapai!" : pct >= 75 ? "💪 Hampir sampai!" : pct >= 50 ? "⚡ Terus semangat!" : "🚀 Yuk tingkatkan!"}</span>
          <span style={{color:"#F1F5F9",fontWeight:500}}>Sisa: {Math.max(0, target - thisMonth.length).toLocaleString()} video</span>
        </div>
      </div>

      <div className="g2" style={{ marginBottom:16 }}>
        {/* CREATOR STATUS — styled like Kelola User */}
        <div className="card">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13.5, color:"#F1F5F9" }}>👥 Status Kreator Hari Ini</div>
            <span style={{ fontSize:11, color:"#475569", background:"#0A0B10", border:"1px solid #1A1F2E", padding:"2px 9px", borderRadius:999 }}>{creatorStats.length} kreator</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {creatorStats.map(({ cr, cnt, todayDone, days }, i) => {
              const initial = cr.charAt(0).toUpperCase();
              const clr = CC[cr] || CAC[i % CAC.length];
              return (
                <div key={cr} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"#0A0B10", border:`1px solid ${todayDone ? "#0a3320" : "#1A1F2E"}` }}>
                  {/* Rank */}
                  <div style={{ fontSize:12, width:20, textAlign:"center", flexShrink:0, color:"#475569", fontWeight:700 }}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                  </div>
                  {/* Avatar */}
                  <div style={{ width:34, height:34, borderRadius:9, background:clr+"28", border:`1px solid ${clr}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:clr, flexShrink:0 }}>
                    {initial}
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#E2E8F0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{cr}</div>
                    <div style={{ fontSize:10.5, color:"#475569", marginTop:1 }}>
                      {cnt} post · {days === null ? "belum pernah" : days === 0 ? "hari ini" : days === 1 ? "kemarin" : `${days} hari lalu`}
                    </div>
                  </div>
                  {/* Status badge */}
                  <span style={{ fontSize:11, padding:"4px 10px", borderRadius:7, background:todayDone?"#052E16":"#1F0808", color:todayDone?"#10B981":"#F87171", fontWeight:700, whiteSpace:"nowrap", flexShrink:0, border:`1px solid ${todayDone?"#0a4a28":"#3d1010"}` }}>
                    {todayDone ? "✅ Sudah" : "❌ Belum"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACCOUNT DIST */}
        <div className="card">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13.5, color:"#F1F5F9" }}>📱 Distribusi per Akun</div>
            <span style={{ fontSize:11, color:"#475569", background:"#0A0B10", border:"1px solid #1A1F2E", padding:"2px 9px", borderRadius:999 }}>{MI[now.getMonth()]}</span>
          </div>
          {accDist.every(a => a.cnt === 0) ? (
            <div style={{ color:"#334155", fontSize:13, textAlign:"center", padding:"20px 0" }}>Belum ada data bulan ini</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {accDist.map(({ acc, cnt, maxV }, i) => {
                const clr = AC[acc] || CAC[i % CAC.length];
                return (
                  <div key={acc} style={{ padding:"9px 12px", background:"#0A0B10", border:"1px solid #1A1F2E", borderRadius:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:6 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:clr, flexShrink:0 }}/>
                      <span style={{ fontSize:12.5, fontWeight:600, color:"#CBD5E1", flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{acc}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:clr }}>{cnt}</span>
                    </div>
                    <div className="pbar">
                      <div className="pfill" style={{ width:`${maxV>0?(cnt/maxV)*100:0}%`, background:clr }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="card">
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13.5, color:"#F1F5F9", marginBottom:13 }}>⚡ Aksi Cepat</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="btn-p" onClick={() => setPage("input")}><Icon name="plus" size={14}/> Input Laporan</button>
          <button className="btn-s" onClick={() => setPage("productivity")}><Icon name="chart" size={14}/> Produktivitas</button>
          <button className="btn-s" onClick={() => setPage("history")}><Icon name="hist" size={14}/> History</button>
        </div>
      </div>
    </div>
  );
}

// ─── INPUT PAGE ───────────────────────────────────────────────────────────────
function InputPage({ data, addPost, updData, showToast, setPage, loggedUsername, role }) {
  const td = todayStr();

  // Ambil nama lengkap dari data Kelola User (bukan hanya username)
  const getUserDisplayName = () => {
    if (!loggedUsername) return "";
    // Cek di localStorage users — ambil nama lengkap
    const allUsers = loadUsers();
    const ukey = loggedUsername.trim().toLowerCase();
    if (allUsers[ukey]?.name) return allUsers[ukey].name;
    // Fallback: kapitalisasi username
    return loggedUsername.charAt(0).toUpperCase() + loggedUsername.slice(1);
  };

  const userDisplayName = getUserDisplayName();

  // Cek apakah nama ada di daftar creators
  // Kalau tidak ada → pakai nama langsung (tanpa harus ada di list)
  const matchedCreator = role !== "admin" ? userDisplayName : "";

  const [f, setF] = useState({ date:td, creator:matchedCreator, account:"", theme:"", link:"", status:"" });
  const [er, setEr] = useState({});
  
  const set = (k, v) => { 
    setF(p => ({ ...p, [k]:v })); 
    setEr(p => ({ ...p, [k]:"" })); 
  };
  
  function validate() {
    const e = {};
    if (!f.date)    e.date    = "Wajib diisi";
    if (!f.creator) e.creator = "Pilih kreator";
    if (!f.account) e.account = "Pilih akun";
    if (!f.theme)   e.theme   = "Pilih tema";
    if (!f.link)    e.link    = "Link wajib diisi";
    if (!f.status)  e.status  = "Pilih status";
    setEr(e);
    return !Object.keys(e).length;
  }
  
  function submit() {
    if (!validate()) return;
    // Auto-tambah nama ke creators list kalau belum ada (untuk freelancer baru)
    if (matchedCreator && !(data.creators||[]).some(c => c.toLowerCase() === matchedCreator.toLowerCase())) {
      updData(d => ({ ...d, creators: [...(d.creators||[]), matchedCreator] }));
    }
    addPost({ id: Date.now().toString(), ...f, createdAt: new Date().toISOString() });
    setF({ date:td, creator:matchedCreator, account:"", theme:"", link:"", status:"" });
    showToast("Laporan tersimpan! ✅");
    setPage("calendar");
  }
  
  const Err = ({ msg }) => msg ? <div style={{ color:"#f87171", fontSize:11.5, marginTop:3 }}>{msg}</div> : null;
  
  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h1 className="page-title">Input Laporan Posting</h1>
        <p className="page-sub" style={{ marginTop:3 }}>Isi form berikut untuk melaporkan konten yang telah diposting.</p>
      </div>
      <div className="card" style={{ maxWidth:560 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <CalPicker value={f.date} onChange={v => set("date", v)} label="📅 Tanggal Posting"/>
            <Err msg={er.date}/>
          </div>
          <div className="g2">
            <div>
              <label className="lbl">👤 Nama Pembuat Konten</label>
              {matchedCreator && role !== "admin" ? (
                <div className="inp" style={{display:"flex",alignItems:"center",gap:8,cursor:"default",opacity:0.9}}>
                  <span style={{fontSize:16}}>👤</span>
                  <span style={{fontWeight:600,color:"#e2e8f0"}}>{matchedCreator}</span>
                  <span style={{fontSize:10,color:"#475569",marginLeft:"auto"}}>otomatis</span>
                </div>
              ) : (
                <select value={f.creator} onChange={e => set("creator", e.target.value)} className="inp" style={{ borderColor:er.creator?"#ef4444":"" }}>
                  <option value="">-- Pilih --</option>
                  {(data.creators||[]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <Err msg={er.creator}/>
            </div>
            <div>
              <label className="lbl">📱 Akun Instagram</label>
              <select value={f.account} onChange={e => set("account", e.target.value)} className="inp" style={{ borderColor:er.account?"#ef4444":"" }}>
                <option value="">-- Pilih --</option>
                {(data.accounts||[]).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <Err msg={er.account}/>
            </div>
          </div>
          <div className="g2">
            <div>
              <label className="lbl">🎨 Tema Konten</label>
              <select value={f.theme} onChange={e => set("theme", e.target.value)} className="inp" style={{ borderColor:er.theme?"#ef4444":"" }}>
                <option value="">-- Pilih --</option>
                {(data.themes||[]).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Err msg={er.theme}/>
            </div>
            <div>
              <label className="lbl">📌 Status Konten</label>
              <select value={f.status} onChange={e => set("status", e.target.value)} className="inp" style={{ borderColor:er.status?"#ef4444":"" }}>
                <option value="">-- Pilih Status --</option>
                <option value="Draft">📝 Draft</option>
                <option value="Scheduled">🗓️ Scheduled</option>
                <option value="Posted">✅ Posted</option>
              </select>
              <Err msg={er.status}/>
            </div>
          </div>
          <div>
            <label className="lbl">🔗 Link Konten</label>
            <input type="url" value={f.link} onChange={e => set("link", e.target.value)} placeholder="https://www.instagram.com/p/..." className="inp" style={{ borderColor:er.link?"#ef4444":"" }}/>
            <Err msg={er.link}/>
          </div>
          <button className="btn-p" onClick={submit} style={{ alignSelf:"flex-start" }}><Icon name="check" size={14}/> Simpan Laporan</button>
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR PAGE ────────────────────────────────────────────────────────────
function CalendarPage({ data, role, editPost, delPost, showToast, setCsvModal }) {
  const [vd, setVd] = useState(new Date());
  const [sel, setSel] = useState(null);
  const [fAcc, setFAcc] = useState("all");
  const [editP, setEditP] = useState(null);
  const y = vd.getFullYear(), m = vd.getMonth();
  const fd = new Date(y, m, 1).getDay();
  const dim = new Date(y, m+1, 0).getDate();
  const pd = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = fd-1; i >= 0; i--) cells.push({ d: pd-i, cur: false });
  for (let d = 1; d <= dim; d++) cells.push({ d, cur: true });
  while (cells.length < 42) cells.push({ d: cells.length - fd - dim + 1, cur: false });
  const ts = todayStr();
  const gpd = d => {
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return (data.posts||[]).filter(p => p.date === ds && (fAcc === "all" || p.account === fAcc));
  };
  
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 className="page-title">Kalender Konten</h1>
          <p style={{ color:"#334155", fontSize:13, marginTop:2 }}>{(data.posts||[]).length} konten terinput</p>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <button className="btn-s" style={{ padding:"7px 10px" }} onClick={() => setVd(new Date(y, m-1, 1))}><Icon name="cL" size={13}/></button>
          <span style={{ fontWeight:700, fontSize:13.5, minWidth:148, textAlign:"center" }}>{MI[m]} {y}</span>
          <button className="btn-s" style={{ padding:"7px 10px" }} onClick={() => setVd(new Date(y, m+1, 1))}><Icon name="cR" size={13}/></button>
          <button className="btn-p" onClick={() => exportCSV([["Tanggal","Pembuat","Akun","Tema","Status","Link"],...(data.posts||[]).map(p=>[p.date,p.creator,p.account,p.theme,p.status||"",p.link])],`kalender-${MI[m]}-${y}.csv`, csv=>setCsvModal(csv))}>
            <Icon name="dl" size={13}/> Export
          </button>
        </div>
      </div>
      {/* FILTER */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12, alignItems:"center" }}>
        <span style={{ fontSize:10, fontWeight:700, color:"#334155", textTransform:"uppercase", letterSpacing:".08em" }}>Akun:</span>
        <button onClick={() => setFAcc("all")} style={{ padding:"4px 11px", borderRadius:8, border:"none", background:fAcc==="all"?"linear-gradient(135deg,#6366f1,#7c3aed)":"#0D0F18", color:fAcc==="all"?"white":"#64748b", cursor:"pointer", fontSize:11.5, fontWeight:600, fontFamily:"inherit" }}>Semua</button>
        {(data.accounts||[]).map(acc => (
          <button key={acc} onClick={() => setFAcc(acc)} style={{ padding:"4px 11px", borderRadius:8, border:"none", background:fAcc===acc?(AC[acc]||"#6366f1"):"#0D0F18", color:fAcc===acc?"white":AC[acc]||"#64748b", cursor:"pointer", fontSize:11.5, fontWeight:600, fontFamily:"inherit" }}>{acc}</button>
        ))}
      </div>
      {/* CALENDAR GRID */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {DI.map(d => <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:"#1e2a3a", padding:"3px 0" }}>{d}</div>)}
        {cells.map((cell, i) => {
          const posts = cell.cur ? gpd(cell.d) : [];
          const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(cell.d).padStart(2,"0")}`;
          const isTod = cell.cur && ds === ts;
          return (
            <div key={i} className={`cday${!cell.cur?" om":""}${isTod?" tc":""}${posts.length>0?" hp":""}`}
              onClick={() => cell.cur && posts.length > 0 && setSel({ date:ds, posts })}>
              <div style={{ fontSize:10.5, fontWeight:isTod?700:400, color:isTod?"#818cf8":"#2d3a50", marginBottom:2 }}>{cell.d}</div>
              {posts.slice(0,3).map((p, pi) => (
                <div key={pi} style={{ fontSize:8.5, padding:"1px 4px", borderRadius:3, marginBottom:2, background:(AC[p.account]||"#6366f1")+"22", color:AC[p.account]||"#818cf8", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.creator}</div>
              ))}
              {posts.length > 3 && <div style={{ fontSize:8.5, color:"#2d3a50" }}>+{posts.length-3}</div>}
            </div>
          );
        })}
      </div>
      {/* DAY MODAL */}
      {sel && (
        <div className="ov" onClick={() => setSel(null)}>
          <div className="mod" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15 }}>📅 {sel.date}</h2>
              <button style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer" }} onClick={() => setSel(null)}><Icon name="x" size={17}/></button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {sel.posts.map(p => {
                const sc = SC[p.status || ""] || SC[""];
                return (
                  <div key={p.id} style={{ background:"#0A0B10", border:"1px solid #151c28", borderRadius:11, padding:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:5, marginBottom:7, flexWrap:"wrap" }}>
                          <span className="tag" style={{ background:(CC[p.creator]||"#6366f1")+"22", color:CC[p.creator]||"#818cf8" }}>👤 {p.creator}</span>
                          <span className="tag" style={{ background:(AC[p.account]||"#6366f1")+"22", color:AC[p.account]||"#818cf8" }}>📱 {p.account}</span>
                          <span className="tag" style={{ background:"#1A1F2E", color:"#64748b" }}>🎨 {p.theme}</span>
                          {p.status && <span className="tag" style={{ background:sc.bg, color:sc.color }}>{sc.icon} {p.status}</span>}
                        </div>
                        <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:11.5, color:"#6366f1", display:"flex", alignItems:"center", gap:4 }}><Icon name="link" size={10}/> {p.link.length>44?p.link.slice(0,44)+"...":p.link}</a>
                      </div>
                      {role === "admin" && (
                        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                          <button style={{ background:"#0D0F18", border:"1px solid #1e2535", color:"#94a3b8", padding:"5px 8px", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center" }} onClick={() => setEditP({ ...p })}><Icon name="edit" size={11}/></button>
                          <button className="btn-d" style={{ padding:"5px 8px" }} onClick={() => { delPost(p.id); setSel(s => ({ ...s, posts: s.posts.filter(x => x.id !== p.id) })); showToast("Post dihapus", "err"); }}><Icon name="trash" size={11}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {editP && (
        <EditModal post={editP} data={data}
          onSave={upd => { editPost(editP.id, upd); setSel(s => s ? { ...s, posts: s.posts.map(x => x.id === editP.id ? { ...x, ...upd } : x) } : s); setEditP(null); showToast("Laporan diperbarui! ✅"); }}
          onClose={() => setEditP(null)}/>
      )}
    </div>
  );
}

// ─── PRODUCTIVITY PAGE ────────────────────────────────────────────────────────
function ProductivityPage({ data, updData, showToast, setCsvModal }) {
  const now = new Date();
  const [sd, setSd] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10));
  const [ed, setEd] = useState(() => todayStr());
  const [fc, setFc] = useState("all");
  const [editTgt, setEditTgt] = useState(false);
  const [tgtIn, setTgtIn] = useState(String(data.monthlyTarget || 1500));

  const filt = useMemo(() => (data.posts||[]).filter(p => p.date >= sd && p.date <= ed && (fc === "all" || p.creator === fc)), [data.posts, sd, ed, fc]);
  const byC = useMemo(() => { const m = {}; filt.forEach(p => { m[p.creator] = (m[p.creator]||0)+1; }); return Object.entries(m).sort((a,b) => b[1]-a[1]); }, [filt]);
  const byA = useMemo(() => { const m = {}; filt.forEach(p => { m[p.account] = (m[p.account]||0)+1; }); return Object.entries(m).sort((a,b) => b[1]-a[1]); }, [filt]);
  const trend = useMemo(() => { const m = {}; filt.forEach(p => { const ym = p.date.slice(0,7); m[ym] = (m[ym]||0)+1; }); return Object.entries(m).sort().map(([k,v]) => ({ lb: MI[parseInt(k.slice(5,7))-1].slice(0,3), v })); }, [filt]);
  const maxC = byC[0]?.[1] || 1;

  const ms = monthStr(now);
  const thisMPosted = (data.posts||[]).filter(p => p.date.startsWith(ms)).length;
  const tgt = data.monthlyTarget || 1500;
  const pct = Math.min(100, Math.round((thisMPosted / tgt) * 100));
  const bc = pct >= 100 ? "#10b981" : pct >= 75 ? "#6366f1" : pct >= 50 ? "#f59e0b" : "#f43f5e";

  function preset(p) {
    const y = now.getFullYear(), m = now.getMonth();
    if (p === "thisMonth")  { setSd(`${y}-${String(m+1).padStart(2,"0")}-01`); setEd(todayStr()); }
    else if (p === "lastMonth") { setSd(new Date(y,m-1,1).toISOString().slice(0,10)); setEd(new Date(y,m,0).toISOString().slice(0,10)); }
    else if (p === "thisYear")  { setSd(`${y}-01-01`); setEd(todayStr()); }
    else if (p === "last7")     { const s = new Date(); s.setDate(s.getDate()-7); setSd(s.toISOString().slice(0,10)); setEd(todayStr()); }
    else if (p === "last30")    { const s = new Date(); s.setDate(s.getDate()-30); setSd(s.toISOString().slice(0,10)); setEd(todayStr()); }
  }

  async function exportExcel() {
    try {
      // Load XLSX library jika belum ada (sama seperti export lain)
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      // Load XLSX biasa (sama seperti export kalender)
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const XL = window.XLSX;

      // Sheet 1: Pivot Pembuat
      const pivotRows = [["Pembuat", "Count of Link"]];
      byC.forEach(([name, cnt]) => pivotRows.push([name, cnt]));
      pivotRows.push(["──────────────────────", "──────────────"]);
      pivotRows.push(["Grand Total", filt.length]);

      // Sheet 2: Pivot Akun
      const akunRows = [["Akun", "Count of Link"]];
      byA.forEach(([acc, cnt]) => akunRows.push([acc, cnt]));
      akunRows.push(["──────────────────────────", "──────────────"]);
      akunRows.push(["Grand Total", filt.length]);

      // Sheet 3: Data lengkap periode ini
      const detailRows = [["No","Tanggal","Pembuat","Akun","Tema","Status","Link"]];
      filt.forEach((p, i) => detailRows.push([i+1, p.date, p.creator, p.account||"", p.theme||"", p.status||"", p.link||""]));

      const wb = XL.utils.book_new();

      const ws1 = XL.utils.aoa_to_sheet(pivotRows);
      ws1["!cols"] = [{wch:22},{wch:16}];
      XL.utils.book_append_sheet(wb, ws1, "Pivot Pembuat");

      const ws2 = XL.utils.aoa_to_sheet(akunRows);
      ws2["!cols"] = [{wch:26},{wch:16}];
      XL.utils.book_append_sheet(wb, ws2, "Pivot Akun");

      const ws3 = XL.utils.aoa_to_sheet(detailRows);
      ws3["!cols"] = [{wch:5},{wch:13},{wch:18},{wch:20},{wch:16},{wch:12},{wch:50}];
      XL.utils.book_append_sheet(wb, ws3, "Data Lengkap");

      const fname = `produktivitas_${sd}_sd_${ed}.xlsx`;
      XL.writeFile(wb, fname);
      showToast("File Excel berhasil diunduh! 📊");
    } catch(e) {
      showToast("Gagal export Excel", "err");
    }
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h1 className="page-title">Produktivitas</h1><p style={{ color:"#334155", fontSize:13, marginTop:2 }}>{filt.length} konten dalam periode ini</p></div>
        <button className="btn-p" onClick={exportExcel} style={{gap:7}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Excel
        </button>
      </div>
      {/* TARGET */}
      <div className="card" style={{ marginBottom:14, border:`1px solid ${bc}33` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontSize:9.5, color:"#334155", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginBottom:4 }}>🎯 Target {MI[now.getMonth()]} {now.getFullYear()}</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:bc }}>{thisMPosted.toLocaleString()}</span>
              <span style={{ fontSize:12.5, color:"#334155" }}>/ {tgt.toLocaleString()} video</span>
              <span style={{ fontSize:18, fontWeight:800, color:bc }}>{pct}%</span>
              {pct >= 100 && <span>🏆</span>}
            </div>
          </div>
          {editTgt ? (
            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
              <input type="number" value={tgtIn} onChange={e => setTgtIn(e.target.value)} className="inp" style={{ width:90, padding:"6px 9px", fontSize:13 }}/>
              <button className="btn-p" style={{ padding:"6px 10px" }} onClick={() => { const v = parseInt(tgtIn); if (v > 0) { updData(d => ({ ...d, monthlyTarget:v })); showToast("Target diperbarui! 🎯"); } setEditTgt(false); }}><Icon name="check" size={13}/></button>
              <button className="btn-s" style={{ padding:"6px 9px" }} onClick={() => setEditTgt(false)}><Icon name="x" size={13}/></button>
            </div>
          ) : (
            <button className="btn-s" style={{ padding:"6px 11px", fontSize:11.5 }} onClick={() => { setTgtIn(String(tgt)); setEditTgt(true); }}><Icon name="edit" size={12}/> Set Target</button>
          )}
        </div>
        <div style={{ height:12, background:"#1A1F2E", borderRadius:999, overflow:"hidden", marginBottom:6 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${bc},${bc}bb)`, borderRadius:999, transition:"width .8s ease", boxShadow:`0 0 12px ${bc}44` }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
          <span style={{color:"#f59e0b",fontWeight:600}}>{pct >= 100 ? "🎉 Tercapai!" : pct >= 75 ? "💪 Hampir!" : pct >= 50 ? "⚡ Semangat!" : "🚀 Tingkatkan!"}</span>
          <span style={{color:"#F1F5F9",fontWeight:500}}>Sisa: {Math.max(0, tgt - thisMPosted).toLocaleString()}</span>
        </div>
      </div>
      {/* FILTER */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:13 }}>
          {[["last7","7 Hari"],["last30","30 Hari"],["thisMonth","Bulan Ini"],["lastMonth","Bulan Lalu"],["thisYear","Tahun Ini"]].map(([k,l]) => (
            <button key={k} className="btn-s" style={{ padding:"5px 12px", fontSize:11.5 }} onClick={() => preset(k)}>{l}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
          <CalPicker value={sd} onChange={setSd} label="📅 Dari"/>
          <CalPicker value={ed} onChange={setEd} label="📅 Sampai"/>
          <div><label className="lbl">👤 Pembuat</label><select value={fc} onChange={e => setFc(e.target.value)} className="inp" style={{ width:"auto" }}><option value="all">Semua</option>{(data.creators||[]).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
      </div>
      {/* STAT CARDS */}
      <div className="sgrid" style={{ marginBottom:14 }}>
        {[["TOTAL",filt.length,"#6366f1"],["AKTIF",byC.length,"#10b981"],["AKUN",byA.length,"#f59e0b"],["RATA²",byC.length>0?(filt.length/byC.length).toFixed(1):0,"#ec4899"]].map(([l,v,c]) => (
          <div key={l} className="card" style={{ padding:14 }}><div style={{ fontSize:9, color:"#334155", fontWeight:700, letterSpacing:".1em", marginBottom:6 }}>{l}</div><div style={{ fontSize:26, fontWeight:800, fontFamily:"'Syne',sans-serif", color:c }}>{v}</div></div>
        ))}
      </div>
      {byC[0] && (
        <div className="card" style={{ marginBottom:14, background:"linear-gradient(135deg,#110d26,#0b0e16)", border:"1px solid #6366f122" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:36 }}>👑</div>
            <div>
              <div style={{ fontSize:9.5, color:"#7c3aed", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" }}>Kreator Terproduktif</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"#f1f5f9" }}>{byC[0][0]}</div>
              <div style={{ fontSize:12, color:"#334155" }}>{byC[0][1]} konten periode ini</div>
            </div>
          </div>
        </div>
      )}
      {/* CHARTS */}
      <div className="g2" style={{ marginBottom:14 }}>
        <div className="card">
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, marginBottom:12 }}>📊 Bar Chart</div>
          {byC.length === 0 ? <div style={{ color:"#334155", fontSize:13 }}>Tidak ada data</div> : (
            <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:140, paddingTop:22 }}>
              {byC.map(([n,c], i) => (
                <div key={n} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:CC[n]||CAC[i%10] }}>{c}</div>
                  <div style={{ width:"100%", display:"flex", justifyContent:"center", position:"relative" }}>
                    {i === 0 && <div style={{ position:"absolute", top:-20, fontSize:13 }}>👑</div>}
                    <div style={{ width:"70%", height:`${Math.max((c/maxC)*110, c>0?5:0)}px`, background:CC[n]||CAC[i%10], borderRadius:"5px 5px 0 0", transition:"height .7s", boxShadow:i===0?`0 0 16px ${CC[n]||CAC[0]}55`:"none" }}/>
                  </div>
                  <div style={{ fontSize:9, fontWeight:600, color:CC[n]||CAC[i%10], textAlign:"center", maxWidth:50, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, marginBottom:8 }}>📈 Tren Bulanan</div>
          {trend.length < 2 ? <div style={{ color:"#334155", fontSize:12, paddingTop:16 }}>Butuh 2+ bulan data</div> : (() => {
            const max = Math.max(...trend.map(t => t.v), 1), W = 290, H = 100, pad = 20;
            const xs = trend.map((_, i) => pad + (i/(trend.length-1)) * (W-2*pad));
            const ys = trend.map(t => H - pad - ((t.v/max) * (H-2*pad)));
            const dp = xs.map((x,i) => `${i===0?"M":"L"}${x},${ys[i]}`).join(" ");
            const fp = dp + ` L${xs[xs.length-1]},${H-pad} L${xs[0]},${H-pad} Z`;
            return (
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible", marginTop:4 }}>
                <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity=".22"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient></defs>
                <path d={fp} fill="url(#tg)"/>
                <path d={dp} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                {trend.map((t,i) => <g key={i}><circle cx={xs[i]} cy={ys[i]} r="3.5" fill="#6366f1"/><text x={xs[i]} y={H-3} textAnchor="middle" fontSize="8" fill="#475569">{t.lb}</text>{t.v>0&&<text x={xs[i]} y={ys[i]-8} textAnchor="middle" fontSize="9" fill="#818cf8" fontWeight="700">{t.v}</text>}</g>)}
              </svg>
            );
          })()}
        </div>
      </div>
      {/* RANKING */}
      <div className="g2">
        <div className="card">
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, marginBottom:12 }}>🏆 Ranking Pembuat</div>
          {byC.length === 0 ? <div style={{ color:"#334155", fontSize:13 }}>Tidak ada data</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {byC.map(([n,c],i) => (
                <div key={n} style={{ padding:"9px 12px", borderRadius:10, background:i===0?"#1a1100":i===1?"#0a0f18":i===2?"#150d08":"#0A0B10", border:`1px solid ${i===0?"#f59e0b33":i===1?"#94a3b822":i===2?"#f9731622":"#1A1F2E"}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}><span style={{ fontSize:13 }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span><span style={{ fontSize:13, fontWeight:700, color:CC[n]||"#818cf8" }}>{n}</span></div>
                    <span style={{ fontSize:12.5, fontWeight:700 }}>{c}</span>
                  </div>
                  <div className="pbar"><div className="pfill" style={{ width:`${(c/maxC)*100}%`, background:CC[n]||"#6366f1" }}/></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, marginBottom:12 }}>📱 Distribusi Akun</div>
          {byA.length === 0 ? <div style={{ color:"#334155", fontSize:13 }}>Tidak ada data</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {byA.map(([acc,c]) => (
                <div key={acc} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ flex:1, fontSize:11.5, fontWeight:600, color:AC[acc]||"#818cf8" }}>{acc}</span>
                  <div style={{ flex:1 }}><div className="pbar"><div className="pfill" style={{ width:`${filt.length>0?(c/filt.length)*100:0}%`, background:AC[acc]||"#6366f1" }}/></div></div>
                  <span style={{ fontSize:12, fontWeight:700, minWidth:24, textAlign:"right" }}>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
function HistoryPage({ data, role, editPost, delPost, showToast, setCsvModal }) {
  const [search, setSearch] = useState("");
  const [fc, setFc] = useState("all");
  const [fa, setFa] = useState("all");
  const [fs, setFs] = useState("all");
  const [pg, setPg] = useState(1);
  const [editP, setEditP] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // post object yang mau dihapus
  const PER = 15;

  const sorted = useMemo(() => [...data.posts].sort((a,b) => b.date.localeCompare(a.date)), [data.posts]);

  // Deteksi link duplikat — link sama, pembuat beda
  const dupLinks = useMemo(() => {
    const map = {};
    (data.posts||[]).forEach(p => {
      const key = p.link?.trim().toLowerCase();
      if (!key) return;
      if (!map[key]) map[key] = [];
      if (!map[key].includes(p.creator)) map[key].push(p.creator);
    });
    const dups = new Set();
    Object.entries(map).forEach(([link, creators]) => {
      if (creators.length > 1) dups.add(link);
    });
    return dups;
  }, [data.posts]);

  const filt = useMemo(() => sorted.filter(p => {
    if (fc !== "all" && p.creator !== fc) return false;
    if (fa !== "all" && p.account !== fa) return false;
    if (fs !== "all" && (p.status||"") !== fs) return false;
    if (search && ![p.creator,p.account,p.theme,p.link,p.date,p.status||""].some(v => v.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [sorted, fc, fa, fs, search]);

  const totPg = Math.max(1, Math.ceil(filt.length / PER));
  const paged = filt.slice((pg-1)*PER, pg*PER);
  
  useEffect(() => setPg(1), [fc, fa, fs, search]);

  // Hitung berapa link duplikat total
  const dupCount = dupLinks.size;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div><h1 className="page-title">History Laporan</h1><p style={{ color:"#334155", fontSize:13, marginTop:2 }}>{filt.length} dari {(data.posts||[]).length} laporan</p></div>
      </div>

      {/* NOTIF DUPLIKAT LINK */}
      {dupCount > 0 && (
        <div style={{ background:"#1a0f00", border:"1px solid #92400e55", borderRadius:12, padding:"12px 16px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:11 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#fbbf24", marginBottom:4 }}>
              {dupCount} link terdeteksi dipakai oleh lebih dari 1 pembuat konten
            </div>
            <div style={{ fontSize:11.5, color:"#78716c", lineHeight:1.6 }}>
              Baris dengan ikon <span style={{ background:"#92400e44", color:"#fbbf24", padding:"1px 7px", borderRadius:5, fontWeight:700, fontSize:11 }}>⚠ duplikat</span> menggunakan link yang sama dengan pembuat lain. Mohon periksa kembali.
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div style={{ flex:2, minWidth:160 }}><label className="lbl">🔍 Cari</label><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, akun, tema..." className="inp"/></div>
          <div style={{ flex:1, minWidth:120 }}><label className="lbl">👤 Pembuat</label><select value={fc} onChange={e => setFc(e.target.value)} className="inp"><option value="all">Semua</option>{(data.creators||[]).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div style={{ flex:1, minWidth:130 }}><label className="lbl">📱 Akun</label><select value={fa} onChange={e => setFa(e.target.value)} className="inp"><option value="all">Semua</option>{(data.accounts||[]).map(a => <option key={a} value={a}>{a}</option>)}</select></div>
          <div style={{ flex:1, minWidth:120 }}><label className="lbl">📌 Status</label><select value={fs} onChange={e => setFs(e.target.value)} className="inp"><option value="all">Semua</option><option value="Posted">✅ Posted</option><option value="Scheduled">🗓️ Scheduled</option><option value="Draft">📝 Draft</option></select></div>
          {(search||fc!=="all"||fa!=="all"||fs!=="all") && <button className="btn-s" onClick={() => { setSearch(""); setFc("all"); setFa("all"); setFs("all"); }}><Icon name="x" size={12}/> Reset</button>}
        </div>
      </div>

      {paged.length === 0 ? (
        <div className="card" style={{ textAlign:"center", padding:44, color:"#1e2a3a" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#334155" }}>Tidak ada data ditemukan</div>
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #0d1018", background:"#0A0B10" }}>
                  {["No","Tanggal","Pembuat","Akun","Tema","Status","Link",""].map(h => (
                    <th key={h} style={{ padding:"10px 13px", textAlign:"left", color:"#334155", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:".08em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((p, idx) => {
                  const sc = SC[p.status || ""] || SC[""];
                  const isDup = dupLinks.has(p.link?.trim().toLowerCase());
                  return (
                    <tr key={p.id} className="trow" style={{ borderBottom:"1px solid #080e16", background: isDup ? "#1a0f0044" : undefined }}>
                      <td style={{ padding:"9px 13px", color:"#1e2a3a", fontWeight:600, fontSize:11 }}>{(pg-1)*PER+idx+1}</td>
                      <td style={{ padding:"9px 13px", color:"#64748b", whiteSpace:"nowrap" }}>{p.date}</td>
                      <td style={{ padding:"9px 13px" }}><span className="tag" style={{ background:(CC[p.creator]||"#6366f1")+"22", color:CC[p.creator]||"#818cf8" }}>{p.creator}</span></td>
                      <td style={{ padding:"9px 13px" }}><span className="tag" style={{ background:(AC[p.account]||"#6366f1")+"22", color:AC[p.account]||"#818cf8" }}>{p.account}</span></td>
                      <td style={{ padding:"9px 13px", color:"#64748b" }}>{p.theme}</td>
                      <td style={{ padding:"9px 13px" }}>{p.status ? <span className="tag" style={{ background:sc.bg, color:sc.color }}>{sc.icon} {p.status}</span> : <span style={{ color:"#334155", fontSize:11 }}>—</span>}</td>
                      <td style={{ padding:"9px 13px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color:"#6366f1", fontSize:11.5, display:"flex", alignItems:"center", gap:4 }}><Icon name="link" size={10}/> Lihat</a>
                          {isDup && (
                            <span title="Link ini dipakai oleh lebih dari 1 pembuat!" style={{ background:"#92400e44", color:"#fbbf24", padding:"1px 7px", borderRadius:5, fontWeight:700, fontSize:10, cursor:"default" }}>⚠ duplikat</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:"9px 13px" }}>
                        <div style={{ display:"flex", gap:5 }}>
                          {role === "admin" && <button style={{ background:"#0D0F18", border:"1px solid #1e2535", color:"#94a3b8", padding:"4px 8px", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center" }} onClick={() => setEditP({ ...p })}><Icon name="edit" size={11}/></button>}
                          {role === "admin" && <button className="btn-d" style={{ padding:"4px 8px" }} onClick={() => setConfirmDel(p)}><Icon name="trash" size={11}/></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totPg > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 16px", borderTop:"1px solid #0d1018" }}>
              <span style={{ fontSize:11.5, color:"#334155" }}>Hal {pg}/{totPg} · {filt.length} data</span>
              <div style={{ display:"flex", gap:4 }}>
                <button className="btn-s" disabled={pg===1} onClick={() => setPg(p => p-1)} style={{ padding:"5px 9px", opacity: pg===1 ? 0.35 : 1 }}><Icon name="cL" size={12}/></button>
                {Array.from({length:Math.min(5,totPg)},(_,i) => {
                  const p_ = Math.max(1, Math.min(totPg-4, pg-2)) + i;
                  return <button key={p_} onClick={() => setPg(p_)} style={{ padding:"5px 9px", borderRadius:8, border:"none", background:p_===pg?"linear-gradient(135deg,#F59E0B,#F97316)":"#0D0F18", color:p_===pg?"white":"#64748b", cursor:"pointer", fontSize:12.5, fontWeight:600, minWidth:30 }}>{p_}</button>;
                })}
                <button className="btn-s" disabled={pg===totPg} onClick={() => setPg(p => p+1)} style={{ padding:"5px 9px", opacity: pg===totPg ? 0.35 : 1 }}><Icon name="cR" size={12}/></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {editP && (
        <EditModal post={editP} data={data}
          onSave={upd => { editPost(editP.id, upd); setEditP(null); showToast("Laporan diperbarui! ✅"); }}
          onClose={() => setEditP(null)}/>
      )}

      {/* KONFIRMASI HAPUS MODAL */}
      {confirmDel && (
        <div className="ov" onClick={() => setConfirmDel(null)}>
          <div className="mod" style={{ maxWidth:400, textAlign:"center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:44, marginBottom:12 }}>🗑️</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:17, color:"#f1f5f9", marginBottom:8 }}>Hapus laporan ini?</div>
            <div style={{ background:"#0A0B10", border:"1px solid #1A1F2E", borderRadius:10, padding:"11px 14px", marginBottom:16, textAlign:"left" }}>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:6 }}>
                <span className="tag" style={{ background:(CC[confirmDel.creator]||"#6366f1")+"22", color:CC[confirmDel.creator]||"#818cf8" }}>👤 {confirmDel.creator}</span>
                <span className="tag" style={{ background:(AC[confirmDel.account]||"#6366f1")+"22", color:AC[confirmDel.account]||"#818cf8" }}>📱 {confirmDel.account}</span>
                <span className="tag" style={{ background:"#1A1F2E", color:"#64748b" }}>📅 {confirmDel.date}</span>
              </div>
              <div style={{ fontSize:11.5, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>🔗 {confirmDel.link}</div>
            </div>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Data yang dihapus <strong style={{ color:"#f87171" }}>tidak bisa dikembalikan</strong>.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-s" style={{ flex:1 }} onClick={() => setConfirmDel(null)}>Batal</button>
              <button style={{ flex:1, background:"linear-gradient(135deg,#dc2626,#991b1b)", color:"white", border:"none", padding:"10px 16px", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, fontFamily:"inherit" }}
                onClick={() => { delPost(confirmDel.id); showToast("Post dihapus", "err"); setConfirmDel(null); }}>
                <Icon name="trash" size={14}/> Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ data, updData, showToast, freelancerNames, liveUsers }) {
  const [nA, setNA] = useState(""); const [nT, setNT] = useState("");
  const [eA, setEA] = useState(null); const [eT, setET] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const onAdd    = (k, v, s) => { const t = v.trim(); if (!t) return; updData(d => ({ ...d, [k]: [...(d[k]||[]), t] })); s(""); showToast(`${t} ditambahkan!`); };
  const onDel    = (k, v) => { updData(d => ({ ...d, [k]: (d[k]||[]).filter(x => x !== v) })); showToast("Dihapus", "err"); };
  const onSaveEdit = (k, o, nv, s) => { const t = nv.trim(); if (!t) return; updData(d => ({ ...d, [k]: (d[k]||[]).map(x => x === o ? t : x) })); s(null); showToast("Diperbarui!"); };

  // Pembuat konten = nama freelancer dari Kelola User (sumber tunggal, read-only di sini)
  const creatorDisplay = freelancerNames && freelancerNames.length > 0
    ? freelancerNames
    : (data.creators||[]);

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <h1 className="page-title">Pengaturan</h1>
        <p className="page-sub" style={{ marginTop:3 }}>Kelola data master. Hanya admin.</p>
      </div>

      {/* PEMBUAT KONTEN — mirror dari Kelola User */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:13}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13.5,color:"#F1F5F9"}}>👤 Pembuat Konten</div>
          <span style={{fontSize:11,color:"#475569",background:"#0A0B10",border:"1px solid #1A1F2E",padding:"2px 9px",borderRadius:999}}>{creatorDisplay.length} kreator</span>
        </div>
        <div style={{background:"#0A0B10",border:"1px solid #1A1F2E",borderRadius:10,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>ℹ️</span>
          <span style={{fontSize:12,color:"#475569",lineHeight:1.6}}>Daftar pembuat konten otomatis sinkron dari <strong style={{color:"#F59E0B"}}>Kelola User</strong>. Tambah atau hapus kreator lewat menu Kelola User.</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {creatorDisplay.length === 0 ? (
            <div style={{textAlign:"center",padding:"16px 0",color:"#334155",fontSize:13}}>Belum ada freelancer. Tambahkan di Kelola User.</div>
          ) : creatorDisplay.map((name,i) => {
            const clr = CAC[i % CAC.length];
            return (
              <div key={name} style={{display:"flex",alignItems:"center",gap:10,background:"#060a12",padding:"9px 12px",borderRadius:9,border:"1px solid #1A1F2E"}}>
                <div style={{width:30,height:30,borderRadius:8,background:clr+"22",border:`1px solid ${clr}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:clr,flexShrink:0}}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <span style={{flex:1,fontSize:13.5,fontWeight:500,color:"#CBD5E1"}}>{name}</span>
                <span style={{fontSize:10,color:"#334155",background:"#1A1F2E",padding:"2px 8px",borderRadius:999,fontWeight:600}}>Freelancer</span>
              </div>
            );
          })}
        </div>
      </div>

      <SettingsSection title="Akun Instagram"  emoji="📱" k="accounts" items={data.accounts} nv={nA} setNv={setNA} ed={eA} setEd={setEA} onAdd={onAdd} onDel={onDel} onSaveEdit={onSaveEdit}/>
      <SettingsSection title="Tema Konten"     emoji="🎨" k="themes"   items={data.themes}   nv={nT} setNv={setNT} ed={eT} setEd={setET} onAdd={onAdd} onDel={onDel} onSaveEdit={onSaveEdit}/>
      <div className="card" style={{ border:"1px solid #5c1a1a" }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, marginBottom:7, fontSize:13.5, color:"#f87171" }}>⚠️ Zona Berbahaya</div>
        <p style={{ fontSize:13, color:"#334155", marginBottom:11 }}>Hapus semua data posting secara permanen.</p>
        <button className="btn-d" onClick={() => setConfirmDel(true)}><Icon name="trash" size={13}/> Hapus Semua Data Posting</button>
      </div>
      {confirmDel && (
        <div className="ov" onClick={() => setConfirmDel(false)}>
          <div className="mod" style={{ maxWidth:400, textAlign:"center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:44, marginBottom:14 }}>🗑️</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:18, color:"#f1f5f9", marginBottom:8 }}>Hapus Semua Data?</div>
            <p style={{ fontSize:13, color:"#64748b", lineHeight:1.7, marginBottom:20 }}>Akan menghapus <strong style={{ color:"#f87171" }}>{(data.posts||[]).length} data posting</strong> secara permanen.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button className="btn-s" style={{ flex:1 }} onClick={() => setConfirmDel(false)}>Batal</button>
              <button onClick={() => { updData(d => ({ ...d, posts:[] })); setConfirmDel(false); showToast("Semua data dihapus", "err"); }}
                style={{ flex:1, background:"linear-gradient(135deg,#dc2626,#991b1b)", color:"white", border:"none", padding:"10px 16px", borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, fontFamily:"inherit" }}>
                <Icon name="trash" size={14}/> Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── USERS PAGE (Admin only) ──────────────────────────────────────────────────
function UsersPage({ showToast, setLiveUsers }) {
  const [users, setUsers] = useState(() => loadUsers());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ username:"", name:"", pass:"", role:"freelancer" });
  const [formErr, setFormErr] = useState({});
  const [showPass, setShowPass] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  // Load dari Supabase saat pertama buka
  useEffect(()=>{
    loadUsersFromDB().then(u=>{ setUsers(u); setLoading(false); if(setLiveUsers) setLiveUsers({...u}); });
  },[]);

  // Simpan ke Supabase + localStorage + update state lokal + update App state (buat sinkron Dashboard/Pengaturan)
  const persist = async(u) => {
    setUsers({...u});
    if(setLiveUsers) setLiveUsers({...u});
    await saveUsersToDB(u);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ username:"", name:"", pass:"", role:"freelancer" });
    setFormErr({});
    setShowForm(true);
  };

  const openEdit = (uname) => {
    const u = users[uname];
    setEditTarget(uname);
    setForm({ username:uname, name:u.name||uname, pass:u.pass, role:u.role });
    setFormErr({});
    setShowForm(true);
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Username wajib diisi";
    if (/\s/.test(form.username)) e.username = "Username tidak boleh ada spasi";
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.pass.trim()) e.pass = "Password wajib diisi";
    if (form.pass.length < 4) e.pass = "Password minimal 4 karakter";
    if (!editTarget && users[form.username.trim().toLowerCase()])
      e.username = "Username sudah dipakai";
    setFormErr(e);
    return !Object.keys(e).length;
  };

  const saveForm = async() => {
    if (!validate()) return;
    const uname = form.username.trim().toLowerCase();
    const updated = { ...users };
    if (editTarget && editTarget !== uname) delete updated[editTarget];
    updated[uname] = { pass:form.pass.trim(), role:form.role, name:form.name.trim() };
    await persist(updated);
    setShowForm(false);
    showToast(editTarget ? "User berhasil diperbarui ✅" : "User baru berhasil ditambahkan ✅");
  };

  const deleteUser = async(uname) => {
    const updated = { ...users };
    delete updated[uname];
    await persist(updated);
    setConfirmDel(null);
    showToast("User berhasil dihapus 🗑️");
  };

  const iS = { width:"100%", background:"#0A0B10", border:"1px solid #0d1018", color:"#e2e8f0", padding:"10px 14px", borderRadius:10, fontSize:13.5, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
  const lS = { fontSize:10.5, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:".1em", display:"block", marginBottom:6 };

  const adminUsers = Object.entries(users).filter(([,v]) => v.role === "admin");
  const freeUsers  = Object.entries(users).filter(([,v]) => v.role === "freelancer");

  return (
    <div>
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:"#f1f5f9", marginBottom:4 }}>👥 Kelola User</div>
          <div style={{ fontSize:13, color:"#475569" }}>Tambah, edit, atau hapus akun freelancer & admin</div>
        </div>
        <button onClick={openAdd} style={{ background:"linear-gradient(135deg,#f59e0b,#f97316)", color:"white", border:"none", padding:"10px 18px", borderRadius:10, cursor:"pointer", fontSize:13.5, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
          ＋ Tambah User
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="ov" onClick={()=>setShowForm(false)}>
          <div className="mod" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:"#f1f5f9" }}>
                {editTarget ? "✏️ Edit User" : "➕ Tambah User Baru"}
              </div>
              <button onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
              {/* Username */}
              <div>
                <label style={lS}>Username</label>
                <input value={form.username} onChange={e=>setForm(p=>({...p,username:e.target.value}))}
                  placeholder="contoh: budi" style={{...iS, borderColor:formErr.username?"#ef4444":""}}
                  disabled={!!editTarget}/>
                {formErr.username && <div style={{color:"#f87171",fontSize:11.5,marginTop:4}}>{formErr.username}</div>}
                {editTarget && <div style={{fontSize:11,color:"#334155",marginTop:4}}>Username tidak bisa diubah</div>}
              </div>
              {/* Nama */}
              <div>
                <label style={lS}>Nama Lengkap</label>
                <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                  placeholder="contoh: Budi Santoso" style={{...iS, borderColor:formErr.name?"#ef4444":""}}/>
                {formErr.name && <div style={{color:"#f87171",fontSize:11.5,marginTop:4}}>{formErr.name}</div>}
              </div>
              {/* Password */}
              <div>
                <label style={lS}>Password</label>
                <div style={{position:"relative"}}>
                  <input type={showPass.form?"text":"password"} value={form.pass}
                    onChange={e=>setForm(p=>({...p,pass:e.target.value}))}
                    placeholder="Min. 4 karakter" style={{...iS, paddingRight:40, borderColor:formErr.pass?"#ef4444":""}}/>
                  <button onClick={()=>setShowPass(p=>({...p,form:!p.form}))}
                    style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#475569",display:"flex"}}>
                    <Icon name={showPass.form?"eyeOff":"eye"} size={14}/>
                  </button>
                </div>
                {formErr.pass && <div style={{color:"#f87171",fontSize:11.5,marginTop:4}}>{formErr.pass}</div>}
              </div>
              {/* Role */}
              <div>
                <label style={lS}>Role</label>
                <div style={{display:"flex",gap:8}}>
                  {["freelancer","admin"].map(r=>(
                    <button key={r} onClick={()=>setForm(p=>({...p,role:r}))}
                      style={{flex:1,padding:"9px",borderRadius:9,border:`1px solid ${form.role===r?"#f97316":"#0D0F18"}`,background:form.role===r?"#1a0d00":"#0A0B10",color:form.role===r?"#f97316":"#475569",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                      {r==="admin"?"👑 Admin":"🧑 Freelancer"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Buttons */}
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={()=>setShowForm(false)}
                  style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid #0d1018",background:"#0A0B10",color:"#475569",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  Batal
                </button>
                <button onClick={saveForm}
                  style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#f59e0b,#f97316)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  {editTarget ? "Simpan Perubahan" : "Tambah User"} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Hapus */}
      {confirmDel && (
        <div className="ov" onClick={()=>setConfirmDel(null)}>
          <div className="mod" style={{maxWidth:360,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,marginBottom:10}}>🗑️</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:"#f1f5f9",marginBottom:8}}>Hapus User?</div>
            <p style={{fontSize:13,color:"#64748b",marginBottom:20}}>Akun <strong style={{color:"#f59e0b"}}>{confirmDel}</strong> akan dihapus permanen dan tidak bisa login lagi.</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmDel(null)}
                style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid #0d1018",background:"#0A0B10",color:"#475569",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Batal
              </button>
              <button onClick={()=>deleteUser(confirmDel)}
                style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabel Admin */}
      {[["👑 Admin", adminUsers, "#a78bfa"], ["🧑 Freelancer", freeUsers, "#f59e0b"]].map(([title, list, color]) => (
        <div key={title} className="card" style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <span style={{fontSize:13,fontWeight:700,color,textTransform:"uppercase",letterSpacing:".08em"}}>{title}</span>
            <span style={{fontSize:11,color:"#334155",background:"#0a0c14",padding:"2px 8px",borderRadius:999}}>{list.length} akun</span>
          </div>
          {list.length === 0 ? (
            <div style={{textAlign:"center",padding:"20px 0",color:"#334155",fontSize:13}}>Belum ada user</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {list.map(([uname, udata]) => (
                <div key={uname} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0A0B10",border:"1px solid #0d1018",borderRadius:10,padding:"11px 14px",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                      {udata.name?.[0]?.toUpperCase()||uname[0].toUpperCase()}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:600,color:"#e2e8f0",fontSize:13.5}}>{udata.name||uname}</div>
                      <div style={{fontSize:11,color:"#334155",marginTop:1}}>@{uname} · <span style={{color:"#1e2a3a"}}>{"•".repeat(Math.min((udata.pass||"").length,8))}</span></div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>openEdit(uname)}
                      style={{padding:"6px 12px",borderRadius:8,border:"1px solid #1e2535",background:"#0A0B10",color:"#94a3b8",fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                      ✏️ Edit
                    </button>
                    {uname !== "admin" && (
                      <button onClick={()=>setConfirmDel(uname)}
                        style={{padding:"6px 12px",borderRadius:8,border:"1px solid #2d0a0a",background:"#1f0808",color:"#f87171",fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
