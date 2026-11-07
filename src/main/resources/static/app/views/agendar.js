import {
  esc, icon, $, $$, topbar, fmtMoeda, fmtHora, dataLonga, dataCurta, parseData, isoData, comLoading, toast,
} from "../ui.js";

const CATEGORIAS = [
  { chave: "Cabelo", titulo: "Cabelo", ico: icon.scissors },
  { chave: "Barba", titulo: "Barba", ico: icon.razor },
  { chave: "Combo", titulo: "Combos", ico: icon.combo },
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const POUCOS_HORARIOS = 4;

const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function rolarPara(el) {
  // espera a seção aparecer antes de rolar, para o movimento ficar suave
  requestAnimationFrame(() => el.scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth", block: "start" }));
}

export function render({ root, user, go, api }) {
  const st = {
    servicos: [],
    servico: null,
    calendario: null, // { primeiroDia, ultimoDia, dias: Map(iso -> livres) }
    mes: null,        // Date no dia 1 do mês exibido
    data: null,
    hora: null,
    horarios: [],
    reqHorarios: 0,
  };

  root.innerHTML = `
    ${topbar(user)}
    <div class="container page" data-fluxo>
      <div class="wizard-head">
        <a class="btn btn--ghost btn--icon" href="#/inicio" aria-label="Voltar para o início">${icon.back}</a>
        <h1>Novo agendamento</h1>
      </div>

      <ol class="stepper" aria-label="Etapas do agendamento">
        <li><button class="step" data-step="1" data-state="active" aria-current="step"><span class="step__n">1</span><span class="step__label">Serviço</span></button></li>
        <li><button class="step" data-step="2" data-state="todo" disabled><span class="step__n">2</span><span class="step__label">Data</span></button></li>
        <li><button class="step" data-step="3" data-state="todo" disabled><span class="step__n">3</span><span class="step__label">Horário</span></button></li>
      </ol>

      <section class="stage" id="etapa-1" aria-labelledby="t1">
        <div class="stage__head">
          <h2 class="stage__title" id="t1">Qual serviço você quer?<small>Toque para escolher. O calendário abre em seguida.</small></h2>
        </div>
        <div data-servicos>
          <div class="services">${'<div class="skeleton" style="height:150px"></div>'.repeat(4)}</div>
        </div>
      </section>

      <section class="stage" id="etapa-2" aria-labelledby="t2" hidden>
        <div class="stage__head">
          <h2 class="stage__title" id="t2">Escolha o dia<small>Dias riscados estão lotados.</small></h2>
        </div>
        <div class="card cal" data-cal></div>
      </section>

      <section class="stage" id="etapa-3" aria-labelledby="t3" hidden>
        <div class="stage__head">
          <h2 class="stage__title" id="t3">Escolha o horário<small data-dia-escolhido></small></h2>
        </div>
        <div data-horarios aria-live="polite"></div>
      </section>
    </div>

    <div class="summary" data-summary aria-hidden="true">
      <div class="container summary__inner">
        <div class="summary__text">
          <div class="summary__line" data-sum-linha></div>
          <div class="summary__sub" data-sum-sub></div>
        </div>
        <button class="btn btn--primary btn--lg" data-confirmar tabindex="-1">${icon.check}Confirmar agendamento</button>
      </div>
    </div>`;

  const fluxo = $("[data-fluxo]", root);
  const etapa2 = $("#etapa-2", root);
  const etapa3 = $("#etapa-3", root);
  const summary = $("[data-summary]", root);
  const btnConfirmar = $("[data-confirmar]", root);

  // ---------------- stepper ----------------
  function pintarStepper() {
    const ativo = !st.servico ? 1 : !st.data ? 2 : 3;
    $$(".step", root).forEach((b) => {
      const n = Number(b.dataset.step);
      const feito = (n === 1 && st.servico) || (n === 2 && st.data) || (n === 3 && st.hora);
      const estado = n === ativo && !feito ? "active" : feito ? "done" : n < ativo ? "done" : "todo";
      b.dataset.state = estado;
      b.disabled = estado === "todo";
      if (estado === "active") b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
  }
  $(".stepper", root).addEventListener("click", (e) => {
    const b = e.target.closest(".step");
    if (!b || b.disabled) return;
    rolarPara($(`#etapa-${b.dataset.step}`, root));
  });

  // ---------------- etapa 1: serviços ----------------
  function pintarServicos() {
    const grupos = CATEGORIAS.map((c) => ({ ...c, itens: st.servicos.filter((s) => s.categoria === c.chave) }));
    const outros = st.servicos.filter((s) => !CATEGORIAS.some((c) => c.chave === s.categoria));
    if (outros.length) grupos.push({ chave: "Outros", titulo: "Outros", ico: icon.scissors, itens: outros });

    $("[data-servicos]", root).innerHTML = '<div class="cats">' + grupos
      .filter((g) => g.itens.length)
      .map((g) => `
        <div class="cat" role="group" aria-label="${esc(g.titulo)}">
          <h3 class="cat__title">${esc(g.titulo)}</h3>
          <div class="services">
            ${g.itens.map((s) => `
              <button class="service" data-servico="${s.id}" aria-pressed="${st.servico?.id === s.id}">
                <span class="service__icon">${g.ico}</span>
                <span>
                  <span class="service__name">${esc(s.nome)}${g.chave === "Combo" ? '<span class="badge">Mais pedido</span>' : ""}</span>
                  ${s.descricao ? `<span class="service__desc" style="display:block">${esc(s.descricao)}</span>` : ""}
                  <span class="service__foot">
                    <span class="service__time">${icon.clock}${s.duracaoMinutos} min</span>
                    <span class="service__price">${fmtMoeda(s.valor)}</span>
                  </span>
                </span>
                <span class="service__check">${icon.check}</span>
              </button>`).join("")}
          </div>
        </div>`).join("") + "</div>";
  }

  $("[data-servicos]", root).addEventListener("click", (e) => {
    const b = e.target.closest("[data-servico]");
    if (!b) return;
    st.servico = st.servicos.find((s) => String(s.id) === b.dataset.servico);
    $$("[data-servico]", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    pintarStepper();
    pintarResumo();
    if (etapa2.hidden) {
      abrir(etapa2);
      pintarCalendario();
      rolarPara(etapa2);
    } else if (!st.data) {
      rolarPara(etapa2);
    }
  });

  function abrir(etapa) {
    etapa.hidden = false;
    etapa.classList.remove("is-open");
    void etapa.offsetWidth; // reinicia a animação
    etapa.classList.add("is-open");
  }

  // ---------------- etapa 2: calendário ----------------
  function pintarCalendario() {
    const box = $("[data-cal]", root);
    if (!st.calendario) {
      box.innerHTML = `<div class="skeleton" style="height:320px"></div>`;
      return;
    }
    const { primeiroDia, ultimoDia, dias } = st.calendario;
    const ano = st.mes.getFullYear();
    const mes = st.mes.getMonth();
    const inicioSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const hojeIso = isoData(new Date());
    const podeVoltar = new Date(ano, mes, 1) > new Date(primeiroDia.getFullYear(), primeiroDia.getMonth(), 1);
    const podeAvancar = new Date(ano, mes + 1, 1) <= ultimoDia;
    const titulo = capitalizar(st.mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));

    let celulas = "";
    for (let i = 0; i < inicioSemana; i++) celulas += `<span class="day day--blank" aria-hidden="true"></span>`;
    for (let d = 1; d <= totalDias; d++) {
      const iso = isoData(new Date(ano, mes, d));
      const livres = dias.get(iso);
      const reservavel = livres !== undefined;
      const lotado = reservavel && livres === 0;
      const desabilitado = !reservavel || lotado;
      const rotulo = `${dataLonga(iso)}${!reservavel ? ", indisponível" : lotado ? ", lotado" : `, ${livres} ${livres === 1 ? "horário livre" : "horários livres"}`}`;
      celulas += `<button class="day${lotado ? " is-full" : ""}${iso === hojeIso ? " is-today" : ""}"
        data-dia="${iso}" aria-pressed="${st.data === iso}" aria-label="${esc(rotulo)}" ${desabilitado ? "disabled" : ""}>
        ${d}${!desabilitado && livres <= POUCOS_HORARIOS ? '<span class="day__dot" aria-hidden="true"></span>' : ""}
      </button>`;
    }

    box.innerHTML = `
      <div class="cal__head">
        <button class="btn btn--ghost btn--icon btn--sm" data-mes="-1" aria-label="Mês anterior" ${podeVoltar ? "" : "disabled"}>${icon.back}</button>
        <div class="cal__month" aria-live="polite">${esc(titulo)}</div>
        <button class="btn btn--ghost btn--icon btn--sm" data-mes="1" aria-label="Próximo mês" ${podeAvancar ? "" : "disabled"}>${icon.next}</button>
      </div>
      <div class="cal__grid" role="group" aria-label="Dias de ${esc(titulo)}">
        ${DIAS_SEMANA.map((d) => `<span class="cal__dow" aria-hidden="true">${d}</span>`).join("")}
        ${celulas}
      </div>
      <div class="cal__legend">
        <span><i style="background:var(--warn)"></i>Poucos horários</span>
        <span><i style="background:var(--accent)"></i>Selecionado</span>
      </div>`;
  }

  $("[data-cal]", root).addEventListener("click", (e) => {
    const nav = e.target.closest("[data-mes]");
    if (nav) {
      st.mes = new Date(st.mes.getFullYear(), st.mes.getMonth() + Number(nav.dataset.mes), 1);
      pintarCalendario();
      return;
    }
    const dia = e.target.closest("[data-dia]");
    if (!dia || dia.disabled) return;
    st.data = dia.dataset.dia;
    st.hora = null;
    $$("[data-dia]", root).forEach((x) => x.setAttribute("aria-pressed", String(x === dia)));
    pintarStepper();
    pintarResumo();
    $("[data-dia-escolhido]", root).textContent = capitalizar(dataLonga(st.data));
    abrir(etapa3);
    carregarHorarios();
    rolarPara(etapa3);
  });

  // ---------------- etapa 3: horários ----------------
  async function carregarHorarios() {
    const id = ++st.reqHorarios;
    const box = $("[data-horarios]", root);
    box.innerHTML = `<div class="slots">${'<div class="skeleton" style="height:44px"></div>'.repeat(8)}</div>`;
    try {
      const resp = await api.disponibilidade(st.data);
      if (id !== st.reqHorarios) return; // o usuário trocou de dia enquanto carregava
      st.horarios = resp.horarios.map((h) => ({ hora: fmtHora(h.hora), disponivel: h.disponivel }));
      pintarHorarios();
    } catch (e) {
      if (id !== st.reqHorarios) return;
      box.innerHTML = `<div class="alert" role="alert">${icon.alert}<span>${esc(e.message)}</span></div>
        <button class="btn btn--ghost mt-3" data-recarregar>Tentar de novo</button>`;
    }
  }

  function pintarHorarios() {
    const box = $("[data-horarios]", root);
    const livres = st.horarios.filter((h) => h.disponivel).length;
    if (!livres) {
      box.innerHTML = `<div class="empty">${icon.calendar}<strong>Esse dia lotou</strong>Escolha outra data no calendário acima.</div>`;
      return;
    }
    const grupos = [
      { titulo: "Tarde", ico: icon.sun, itens: st.horarios.filter((h) => h.hora < "18:00") },
      { titulo: "Noite", ico: icon.moon, itens: st.horarios.filter((h) => h.hora >= "18:00") },
    ].filter((g) => g.itens.length);

    box.innerHTML = grupos.map((g) => `
      <div class="slots-group" role="group" aria-label="${g.titulo}">
        <h3>${g.ico}${g.titulo}</h3>
        <div class="slots">
          ${g.itens.map((h) => `<button class="slot" data-hora="${h.hora}" aria-pressed="${st.hora === h.hora}"
              ${h.disponivel ? "" : 'disabled aria-label="' + h.hora + ', ocupado"'}>${h.hora}</button>`).join("")}
        </div>
      </div>`).join("");
  }

  $("[data-horarios]", root).addEventListener("click", (e) => {
    if (e.target.closest("[data-recarregar]")) return carregarHorarios();
    const b = e.target.closest("[data-hora]");
    if (!b || b.disabled) return;
    st.hora = b.dataset.hora;
    $$("[data-hora]", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    pintarStepper();
    pintarResumo();
  });

  // ---------------- resumo + confirmação ----------------
  function pintarResumo() {
    const pronto = st.servico && st.data && st.hora;
    summary.classList.toggle("is-visible", Boolean(pronto));
    summary.setAttribute("aria-hidden", String(!pronto));
    btnConfirmar.tabIndex = pronto ? 0 : -1;
    if (!pronto) return;
    $("[data-sum-linha]", root).textContent = `${st.servico.nome} · ${fmtMoeda(st.servico.valor)}`;
    $("[data-sum-sub]", root).textContent = `${capitalizar(dataCurta(st.data))} às ${st.hora} · ${st.servico.duracaoMinutos} min`;
  }

  btnConfirmar.addEventListener("click", async () => {
    if (!st.servico || !st.data || !st.hora) return;
    try {
      const ag = await comLoading(btnConfirmar, () => api.agendar(st.servico.id, st.data, st.hora));
      sucesso(ag);
    } catch (e) {
      toast(e.message, "erro");
      if (e.status === 409) {
        st.hora = null;
        pintarResumo();
        pintarStepper();
        carregarHorarios();
        carregarCalendario();
      }
    }
  });

  function sucesso(ag) {
    summary.remove();
    fluxo.innerHTML = `
      <div class="success" role="status">
        <div class="success__icon">${icon.check}</div>
        <h1 class="title-xl">Horário marcado!</h1>
        <p class="lead">Enviamos a confirmação para o seu e-mail.</p>
        <div class="card success__card">
          <div class="kv"><span>Serviço</span><strong>${esc(ag.servico)}</strong></div>
          <div class="kv"><span>Data</span><strong>${esc(capitalizar(dataLonga(ag.data)))}</strong></div>
          <div class="kv"><span>Horário</span><strong>${fmtHora(ag.hora)}</strong></div>
          <div class="kv"><span>Valor</span><strong>${fmtMoeda(ag.valor)}</strong></div>
        </div>
        <div class="actions">
          <a class="btn btn--primary btn--lg" href="#/inicio">Ver meus agendamentos</a>
          <button class="btn btn--ghost btn--lg" data-outro>Agendar outro</button>
        </div>
      </div>`;
    $("[data-outro]", fluxo).addEventListener("click", () => go("agendar"));
    window.scrollTo({ top: 0, behavior: reduzMovimento() ? "auto" : "smooth" });
  }

  // ---------------- carga inicial (em paralelo) ----------------
  async function carregarCalendario() {
    try {
      const c = await api.calendario();
      const primeiroDia = parseData(c.primeiroDia);
      st.calendario = {
        primeiroDia,
        ultimoDia: parseData(c.ultimoDia),
        dias: new Map(c.dias.map((d) => [d.data, d.livres])),
      };
      if (!st.mes) st.mes = new Date(primeiroDia.getFullYear(), primeiroDia.getMonth(), 1);
      if (!etapa2.hidden) pintarCalendario();
    } catch (e) {
      if (!etapa2.hidden) $("[data-cal]", root).innerHTML = `<div class="alert" role="alert">${icon.alert}<span>${esc(e.message)}</span></div>`;
    }
  }

  api.servicos()
    .then((s) => { st.servicos = s; pintarServicos(); })
    .catch((e) => {
      $("[data-servicos]", root).innerHTML = `<div class="alert" role="alert">${icon.alert}<span>${esc(e.message)}</span></div>`;
    });
  carregarCalendario();

  return () => summary.remove();
}

function capitalizar(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
