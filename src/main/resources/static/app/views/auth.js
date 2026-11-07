import { esc, icon, $, comLoading, toast, waLink, primeiroNome } from "../ui.js";

const logo = `<img class="auth__logo" src="/imagens/logo.webp" alt="Pitbull Barber" width="112" height="112" />`;

const waFloat = () => `<a class="wa-float" href="${waLink("Olá! Gostaria de ajuda com o agendamento da barbearia.")}"
  target="_blank" rel="noopener" aria-label="Falar com a barbearia no WhatsApp">${icon.whatsapp}</a>`;

function campoSenha(id, label, { autocomplete, hint = "" }) {
  return `<div class="field">
    <label for="${id}">${label}</label>
    <div class="input-wrap">
      <input class="input" id="${id}" name="senha" type="password" autocomplete="${autocomplete}" required minlength="6" />
      <button type="button" class="btn btn--quiet btn--icon" data-toggle-senha="${id}" aria-label="Mostrar senha" aria-pressed="false">${icon.eye}</button>
    </div>
    ${hint ? `<p class="field__hint">${hint}</p>` : ""}
  </div>`;
}

function ligarToggleSenha(root) {
  root.querySelectorAll("[data-toggle-senha]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = root.querySelector(`#${btn.dataset.toggleSenha}`);
      const mostrar = input.type === "password";
      input.type = mostrar ? "text" : "password";
      btn.setAttribute("aria-pressed", String(mostrar));
      btn.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
      btn.innerHTML = mostrar ? icon.eyeOff : icon.eye;
    });
  });
}

function mostrarErro(root, msg) {
  const box = $("[data-erro]", root);
  box.hidden = !msg;
  box.innerHTML = msg ? `${icon.alert}<span>${esc(msg)}</span>` : "";
}

// ================= ENTRAR =================
export function entrar({ root, params, go, setUser, api }) {
  const erroGoogle = params.get("erro") === "google";
  root.innerHTML = `
    <section class="auth">
      <div class="card card--glass auth__card">
        ${logo}
        <h1 class="auth__title">Bem-vindo de volta</h1>
        <p class="auth__sub">Entre para agendar seu horário.</p>

        <form class="form" novalidate>
          <div class="alert" role="alert" data-erro hidden></div>
          <div class="field">
            <label for="email">E-mail</label>
            <input class="input" id="email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="voce@email.com" />
          </div>
          ${campoSenha("senha", "Senha", { autocomplete: "current-password" })}
          <button class="btn btn--primary btn--lg btn--block" type="submit">Entrar</button>
        </form>

        <div class="divider mt-5">ou</div>
        <a class="btn btn--google btn--block mt-4" href="/oauth2/authorization/google">${icon.google}Continuar com Google</a>

        <p class="auth__foot">Ainda não tem conta? <a class="link" href="#/cadastro">Criar conta</a></p>
      </div>
    </section>
    ${waFloat()}`;

  ligarToggleSenha(root);
  if (erroGoogle) mostrarErro(root, "Não foi possível entrar com o Google. Tente novamente.");

  const form = $("form", root);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const senha = form.senha.value;
    if (!email || !senha) {
      mostrarErro(root, "Informe e-mail e senha.");
      (email ? form.senha : form.email).focus();
      return;
    }
    mostrarErro(root, "");
    try {
      const user = await comLoading($('button[type="submit"]', form), () => api.login(email, senha));
      setUser(user);
      toast(`Olá, ${primeiroNome(user.nome)}!`);
      go(user.perfil === "ADMIN" ? "admin" : "inicio");
    } catch (err) {
      mostrarErro(root, err.message);
      form.senha.select();
    }
  });
  setTimeout(() => form.email.focus(), 50);
}

// ================= CADASTRO =================
function mascaraTelefone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function cadastro({ root, go, setUser, api }) {
  root.innerHTML = `
    <section class="auth">
      <div class="card card--glass auth__card">
        ${logo}
        <h1 class="auth__title">Criar conta</h1>
        <p class="auth__sub">Leva menos de um minuto.</p>

        <form class="form" novalidate>
          <div class="alert" role="alert" data-erro hidden></div>
          <div class="field">
            <label for="nome">Nome completo</label>
            <input class="input" id="nome" name="nome" autocomplete="name" required placeholder="Seu nome" />
          </div>
          <div class="field">
            <label for="telefone">Celular / WhatsApp</label>
            <input class="input" id="telefone" name="telefone" type="tel" inputmode="tel" autocomplete="tel-national" required placeholder="(48) 99999-9999" />
          </div>
          <div class="field">
            <label for="email">E-mail</label>
            <input class="input" id="email" name="email" type="email" inputmode="email" autocomplete="email" required placeholder="voce@email.com" />
            <p class="field__hint">Enviamos a confirmação do agendamento para ele.</p>
          </div>
          ${campoSenha("senha", "Senha", { autocomplete: "new-password", hint: "Mínimo de 6 caracteres." })}
          <button class="btn btn--primary btn--lg btn--block" type="submit">Criar conta e entrar</button>
        </form>

        <p class="auth__foot">Já tem conta? <a class="link" href="#/entrar">Entrar</a></p>
      </div>
    </section>`;

  ligarToggleSenha(root);
  const form = $("form", root);
  form.telefone.addEventListener("input", () => {
    form.telefone.value = mascaraTelefone(form.telefone.value);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dados = {
      nome: form.nome.value.trim(),
      telefone: form.telefone.value,
      email: form.email.value.trim(),
      senha: form.senha.value,
    };
    const digitos = dados.telefone.replace(/\D/g, "").length;
    const erros = [
      [!dados.nome || dados.nome.length < 2, form.nome, "Informe seu nome."],
      [digitos < 10 || digitos > 11, form.telefone, "Telefone inválido. Informe DDD + número."],
      [!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email), form.email, "E-mail inválido."],
      [dados.senha.length < 6, form.senha, "A senha deve ter pelo menos 6 caracteres."],
    ];
    form.querySelectorAll(".input").forEach((i) => i.removeAttribute("aria-invalid"));
    const erro = erros.find(([cond]) => cond);
    if (erro) {
      erro[1].setAttribute("aria-invalid", "true");
      erro[1].focus();
      mostrarErro(root, erro[2]);
      return;
    }
    mostrarErro(root, "");
    try {
      const user = await comLoading($('button[type="submit"]', form), () => api.cadastro(dados));
      setUser(user);
      toast("Conta criada! Agora é só agendar.");
      go("agendar");
    } catch (err) {
      mostrarErro(root, err.message);
    }
  });
  setTimeout(() => form.nome.focus(), 50);
}
