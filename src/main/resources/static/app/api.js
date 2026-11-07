// Cliente HTTP da API REST (/api/**).
// Sessão via cookie HttpOnly; CSRF via cookie XSRF-TOKEN -> header X-XSRF-TOKEN.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function csrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function request(method, url, body, { silent401 = false } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const token = csrfToken();
    if (token) headers["X-XSRF-TOKEN"] = token;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: "same-origin",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Verifique sua internet.");
  }

  if (res.status === 204) return null;

  let data = null;
  const type = res.headers.get("Content-Type") || "";
  if (type.includes("application/json")) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok) {
    if (res.status === 401 && !silent401) onUnauthorized();
    const msg =
      (data && data.erro) ||
      (res.status === 403 ? "Você não tem permissão para isso." :
       res.status === 401 ? "Sua sessão expirou. Entre novamente." :
       "Algo deu errado. Tente novamente.");
    throw new ApiError(res.status, msg);
  }
  return data;
}

const get = (url, opts) => request("GET", url, undefined, opts);
const post = (url, body, opts) => request("POST", url, body, opts);

// cache em memória para dados que mudam pouco
let servicosCache = null;

export const api = {
  me: () => get("/api/auth/me", { silent401: true }),
  login: (email, senha) => post("/api/auth/login", { email, senha }, { silent401: true }),
  cadastro: (dados) => post("/api/auth/cadastro", dados),
  logout: () => post("/api/auth/logout"),

  servicos: () => (servicosCache ??= get("/api/servicos").catch((e) => { servicosCache = null; throw e; })),

  calendario: () => get("/api/agendamentos/calendario"),
  disponibilidade: (data) => get(`/api/agendamentos/disponibilidade?data=${encodeURIComponent(data)}`),
  meus: () => get("/api/agendamentos/meus"),
  agendar: (servicoId, data, hora) => post("/api/agendamentos", { servicoId, data, hora }),
  cancelarMeu: (id) => post(`/api/agendamentos/${id}/cancelar`),

  agendaAdmin: (data) => get(`/api/admin/agenda?data=${encodeURIComponent(data)}`),
  concluir: (id) => post(`/api/admin/agendamentos/${id}/concluir`),
  cancelarAdmin: (id) => post(`/api/admin/agendamentos/${id}/cancelar`),
  relatorio: (params) => get(`/api/admin/relatorio?${new URLSearchParams(params)}`),
  resumo: () => get("/api/admin/relatorio/resumo"),
  pdfUrl: (params) => `/api/admin/relatorio/pdf?${new URLSearchParams(params)}`,
};
