// Utilitários de interface: escape, ícones, formatação, toasts, diálogo, topbar.

/** Escapa texto para interpolar em HTML (todo dado vindo da API passa por aqui). */
export function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- ícones (SVG inline, herdam currentColor) ----------
const svg = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const icon = {
  scissors: svg('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>'),
  razor: svg('<path d="M3 17 14 6l4 4L7 21H3z"/><path d="m14 6 2-2 4 4-2 2"/><path d="M9 15l2 2"/>'),
  combo: svg('<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 'stroke-width="2.6"'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  next: svg('<path d="M9 18l6-6-6-6"/>'),
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  pin: svg('<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'),
  phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
  alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9M9.9 5.2A9.3 9.3 0 0 1 12 5c6.5 0 10 7 10 7a18.7 18.7 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  money: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.8.4 3.5 3.5 0 0 0-1.1 2.6 6 6 0 0 0 1.3 3.2 13.8 13.8 0 0 0 5.3 4.7c2.6 1 2.6.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.8 17.9L.1 24l6.3-1.6A11.8 11.8 0 0 0 23.9 12a11.7 11.7 0 0 0-3.5-8.4z"/></svg>',
  google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
};

// ---------- formatação ----------
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const fmtMoeda = (v) => brl.format(Number(v ?? 0));
export const fmtHora = (h) => String(h ?? "").slice(0, 5);

/** "2026-11-14" -> Date local (sem cair no fuso UTC) */
export function parseData(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function isoData(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
const fmtLongo = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
const fmtCurto = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
const fmtNum = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
export const dataLonga = (iso) => fmtLongo.format(parseData(iso));
export const dataCurta = (iso) => fmtCurto.format(parseData(iso)).replaceAll(".", "");
export const dataNum = (iso) => fmtNum.format(parseData(iso));

export function dateBadge(iso) {
  const d = parseData(iso);
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  const sem = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `<div class="datebadge" aria-hidden="true">
    <div class="datebadge__m">${esc(mes)}</div>
    <div class="datebadge__d">${d.getDate()}</div>
    <div class="datebadge__w">${esc(sem)}</div>
  </div>`;
}

const STATUS = {
  AGENDADO: { label: "Agendado", cls: "agendado", ico: icon.clock },
  CONCLUIDO: { label: "Concluído", cls: "concluido", ico: icon.check },
  CANCELADO: { label: "Cancelado", cls: "cancelado", ico: icon.x },
};
export function statusPill(status) {
  const s = STATUS[status] || STATUS.AGENDADO;
  return `<span class="pill pill--${s.cls}">${s.ico}${s.label}</span>`;
}

// ---------- toasts ----------
export function toast(msg, tipo = "ok") {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = `toast toast--${tipo}`;
  el.innerHTML = `${tipo === "ok" ? icon.check : icon.alert}<span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add("is-leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, tipo === "ok" ? 3200 : 5200);
}

// ---------- diálogo de confirmação ----------
export function confirmar({ titulo, texto, ok = "Confirmar", cancelar = "Voltar", perigo = false }) {
  const dlg = document.getElementById("confirm");
  document.getElementById("confirm-title").textContent = titulo;
  document.getElementById("confirm-text").textContent = texto;
  const btnOk = document.getElementById("confirm-ok");
  btnOk.textContent = ok;
  btnOk.className = `btn ${perigo ? "btn--danger" : "btn--primary"}`;
  document.getElementById("confirm-cancel").textContent = cancelar;
  return new Promise((resolve) => {
    dlg.addEventListener("close", () => resolve(dlg.returnValue === "ok"), { once: true });
    dlg.returnValue = "";
    dlg.showModal();
    document.getElementById("confirm-cancel").focus();
  });
}

/** Coloca o botão em estado de carregamento enquanto a promise roda. */
export async function comLoading(btn, fn) {
  btn.classList.add("is-loading");
  btn.setAttribute("aria-busy", "true");
  btn.disabled = true;
  try {
    return await fn();
  } finally {
    btn.classList.remove("is-loading");
    btn.removeAttribute("aria-busy");
    btn.disabled = false;
  }
}

// ---------- blocos compartilhados ----------
export const WHATSAPP = "5548998348321";
export const waLink = (texto) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;

export function topbar(user, { nav = "" } = {}) {
  return `<header class="topbar">
    <div class="container topbar__inner">
      <a class="brand" href="#/${user?.perfil === "ADMIN" ? "admin" : "inicio"}" aria-label="Pitbull Barber, início">
        <img src="/imagens/logo.webp" alt="" width="40" height="40" /><span>Pitbull Barber</span>
      </a>
      ${nav}
      ${user ? `<span class="topbar__user">${esc(primeiroNome(user.nome))}</span>
      <button class="btn btn--quiet btn--sm" data-action="logout" aria-label="Sair da conta">${icon.logout}<span>Sair</span></button>` : ""}
    </div>
  </header>`;
}

export function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}
