// SPA Pitbull Barber: roteamento por hash, sem recarregar a página.
import { api, setUnauthorizedHandler } from "./api.js";
import { toast } from "./ui.js";

const app = document.getElementById("app");

const routes = {
  "entrar":          { load: () => import("./views/auth.js"),      export: "entrar",    acesso: "publico" },
  "cadastro":        { load: () => import("./views/auth.js"),      export: "cadastro",  acesso: "publico" },
  "inicio":          { load: () => import("./views/inicio.js"),    export: "render",    acesso: "CLIENTE" },
  "agendar":         { load: () => import("./views/agendar.js"),   export: "render",    acesso: "CLIENTE" },
  "admin":           { load: () => import("./views/admin.js"),     export: "render",    acesso: "ADMIN" },
  "admin/relatorio": { load: () => import("./views/relatorio.js"), export: "render",    acesso: "ADMIN" },
};

const state = { user: null, cleanup: null, renderId: 0 };

const home = (user) => (user?.perfil === "ADMIN" ? "admin" : "inicio");

export function go(path, { replace = false } = {}) {
  const hash = `#/${path}`;
  if (location.hash === hash) {
    render();
  } else if (replace) {
    history.replaceState(null, "", hash);
    render();
  } else {
    location.hash = hash;
  }
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  return { path: path.replace(/\/$/, ""), params: new URLSearchParams(query) };
}

async function render() {
  const id = ++state.renderId;
  let { path, params } = parseHash();
  let route = routes[path];

  // guarda de rotas
  if (!route) {
    return go(state.user ? home(state.user) : "entrar", { replace: true });
  }
  if (route.acesso === "publico" && state.user) {
    return go(home(state.user), { replace: true });
  }
  if (route.acesso !== "publico") {
    if (!state.user) return go("entrar", { replace: true });
    if (route.acesso !== state.user.perfil) return go(home(state.user), { replace: true });
  }

  document.body.dataset.rota = path;
  const mod = await route.load();
  if (id !== state.renderId) return; // o usuário já navegou para outra tela

  const swap = () => {
    if (typeof state.cleanup === "function") state.cleanup();
    state.cleanup = null;
    app.innerHTML = "";
    const view = document.createElement("div");
    view.className = "view";
    app.appendChild(view);
    window.scrollTo({ top: 0, behavior: "instant" });
    state.cleanup = mod[route.export]({ root: view, user: state.user, params, go, setUser, api });
    app.focus({ preventScroll: true });
  };

  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.startViewTransition(swap);
  } else {
    swap();
  }
}

export function setUser(user) {
  state.user = user;
  if (user) prefetch(user);
}

/** Antecipa o que a próxima tela vai precisar, para a navegação parecer instantânea. */
function prefetch(user) {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  idle(() => {
    if (user.perfil === "CLIENTE") {
      import("./views/inicio.js");
      import("./views/agendar.js");
      api.servicos().catch(() => {});
    } else {
      import("./views/admin.js");
      import("./views/relatorio.js");
    }
  });
}

// logout de qualquer tela
document.addEventListener("click", async (e) => {
  const btn = e.target.closest('[data-action="logout"]');
  if (!btn) return;
  btn.disabled = true;
  try {
    await api.logout();
  } catch {
    /* mesmo com erro, sai localmente */
  }
  state.user = null;
  go("entrar");
  toast("Você saiu da sua conta.");
});

setUnauthorizedHandler(() => {
  if (!state.user) return;
  state.user = null;
  toast("Sua sessão expirou. Entre novamente.", "erro");
  go("entrar");
});

window.addEventListener("hashchange", render);

// inicialização
(async () => {
  try {
    setUser(await api.me());
  } catch {
    state.user = null;
  }
  render();
})();

// ---------------- PWA ----------------
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

let promptInstalacao = null;
const barraInstalar = document.getElementById("install");
const FECHOU = "pitbull:instalar-fechado";
const jaFechou = () => {
  try { return localStorage.getItem(FECHOU) === "1"; } catch { return false; }
};

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptInstalacao = e;
  if (!jaFechou()) mostrarInstalar(true);
});
function mostrarInstalar(sim) {
  barraInstalar.hidden = !sim;
  document.body.classList.toggle("tem-install", sim);
}
document.getElementById("install-ok").addEventListener("click", async () => {
  if (!promptInstalacao) return;
  mostrarInstalar(false);
  promptInstalacao.prompt();
  const { outcome } = await promptInstalacao.userChoice;
  promptInstalacao = null;
  if (outcome === "accepted") toast("App instalado! Procure o ícone na sua tela inicial.");
});
document.getElementById("install-fechar").addEventListener("click", () => {
  mostrarInstalar(false);
  try { localStorage.setItem(FECHOU, "1"); } catch { /* sem storage: só esconde */ }
});
window.addEventListener("appinstalled", () => mostrarInstalar(false));
