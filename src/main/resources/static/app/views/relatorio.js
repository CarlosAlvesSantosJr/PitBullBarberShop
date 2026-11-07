import { esc, icon, $, $$, topbar, statusPill, fmtHora, fmtMoeda, dataNum } from "../ui.js";
import { adminNav } from "./admin.js";

const STATUS = [
  { v: "", label: "Todos" },
  { v: "AGENDADO", label: "Agendados" },
  { v: "CONCLUIDO", label: "Concluídos" },
  { v: "CANCELADO", label: "Cancelados" },
];
const TAMANHO = 10;

export function render({ root, user, api }) {
  const f = { status: "", nome: "", ordenar: "recentes", pagina: 0 };
  let debounce;
  let req = 0;

  root.innerHTML = `
    ${topbar(user, { nav: adminNav("relatorio") })}
    <div class="container page">
      <div class="section__head">
        <div>
          <p class="eyebrow">Visão geral</p>
          <h1 class="title-xl">Relatório</h1>
        </div>
        <a class="btn btn--primary" data-pdf href="#" download>${icon.download}Exportar PDF</a>
      </div>

      <div class="report-top">
        <section class="card" aria-labelledby="t-status">
          <h2 class="stage__title" id="t-status">Agendamentos por status</h2>
          <div class="status-tiles mt-4" data-status-tiles>${'<div class="skeleton" style="height:70px"></div>'.repeat(3)}</div>
        </section>
        <section class="card" aria-labelledby="t-rank">
          <h2 class="stage__title" id="t-rank">Serviços mais feitos<small>Agendados + concluídos</small></h2>
          <ol class="rank mt-4" data-rank>${'<li class="skeleton" style="height:18px"></li>'.repeat(4)}</ol>
        </section>
      </div>

      <div class="filters">
        <div class="search">
          ${icon.search}
          <label class="sr-only" for="busca">Buscar por cliente</label>
          <input class="input" id="busca" type="search" placeholder="Buscar por cliente…" autocomplete="off" />
        </div>
        <div class="seg" role="group" aria-label="Filtrar por status">
          ${STATUS.map((s) => `<button data-status="${s.v}" aria-pressed="${s.v === ""}">${s.label}</button>`).join("")}
        </div>
        <label class="sr-only" for="ordenar">Ordenar por</label>
        <select class="input" id="ordenar" style="width:auto">
          <option value="recentes">Mais recentes</option>
          <option value="antigos">Mais antigos</option>
          <option value="servico">Por serviço</option>
        </select>
      </div>

      <div class="table-wrap">
        <table class="table">
          <caption class="sr-only">Lista de agendamentos filtrada</caption>
          <thead><tr><th>Cliente</th><th>Serviço</th><th>Data</th><th>Hora</th><th>Status</th><th class="num">Valor</th></tr></thead>
          <tbody data-tbody></tbody>
        </table>
      </div>
      <div class="pager">
        <span data-pager-info aria-live="polite"></span>
        <div class="pager__btns">
          <button class="btn btn--ghost btn--sm" data-pag="-1">${icon.back}Anterior</button>
          <button class="btn btn--ghost btn--sm" data-pag="1">Próxima${icon.next}</button>
        </div>
      </div>
    </div>`;

  const tbody = $("[data-tbody]", root);

  function paramsFiltro() {
    const p = { ordenar: f.ordenar };
    if (f.status) p.status = f.status;
    if (f.nome) p.nome = f.nome;
    return p;
  }

  async function carregarTabela() {
    const id = ++req;
    $("[data-pdf]", root).href = api.pdfUrl(paramsFiltro());
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton" style="height:140px"></div></td></tr>`;
    try {
      const r = await api.relatorio({ ...paramsFiltro(), pagina: f.pagina, tamanho: TAMANHO });
      if (id !== req) return;
      tbody.innerHTML = r.itens.length
        ? r.itens.map((a) => `<tr>
            <td data-label="Cliente">${esc(a.cliente)}</td>
            <td data-label="Serviço">${esc(a.servico)}</td>
            <td data-label="Data">${dataNum(a.data)}</td>
            <td data-label="Hora">${fmtHora(a.hora)}</td>
            <td data-label="Status">${statusPill(a.status)}</td>
            <td data-label="Valor" class="num">${fmtMoeda(a.valor)}</td>
          </tr>`).join("")
        : `<tr><td colspan="6"><div class="empty" style="border:0">${icon.search}<strong>Nada encontrado</strong>Ajuste a busca ou os filtros.</div></td></tr>`;
      const total = r.totalPaginas || 1;
      $("[data-pager-info]", root).textContent =
        `${r.totalItens} ${r.totalItens === 1 ? "agendamento" : "agendamentos"} · página ${r.pagina + 1} de ${total}`;
      $('[data-pag="-1"]', root).disabled = r.pagina <= 0;
      $('[data-pag="1"]', root).disabled = r.pagina + 1 >= total;
    } catch (e) {
      if (id !== req) return;
      tbody.innerHTML = `<tr><td colspan="6"><div class="alert" role="alert">${icon.alert}<span>${esc(e.message)}</span></div></td></tr>`;
    }
  }

  async function carregarResumo() {
    try {
      const r = await api.resumo();
      const rot = { AGENDADO: ["A atender", icon.clock], CONCLUIDO: ["Concluídos", icon.check], CANCELADO: ["Cancelados", icon.x] };
      $("[data-status-tiles]", root).innerHTML = Object.entries(r.porStatus).map(([k, v]) =>
        `<div class="stat" style="padding:0"><div class="stat__label">${rot[k][1]}${rot[k][0]}</div><div class="stat__value">${v}</div></div>`).join("");

      const max = Math.max(1, ...r.ranking.map((x) => x.total));
      $("[data-rank]", root).innerHTML = r.ranking.length
        ? r.ranking.map((x) => `<li class="rank__row" title="${esc(x.servico)}: ${x.total}">
            <span class="rank__name">${esc(x.servico)}</span>
            <span class="rank__track" aria-hidden="true"><span class="rank__bar" style="display:block;width:${(x.total / max) * 100}%"></span></span>
            <span class="rank__val">${x.total}</span>
          </li>`).join("")
        : `<li class="muted">Ainda não há atendimentos.</li>`;
    } catch (e) {
      $("[data-rank]", root).innerHTML = `<li class="alert">${icon.alert}<span>${esc(e.message)}</span></li>`;
    }
  }

  $(".seg", root).addEventListener("click", (e) => {
    const b = e.target.closest("[data-status]");
    if (!b) return;
    f.status = b.dataset.status;
    f.pagina = 0;
    $$("[data-status]", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    carregarTabela();
  });

  $("#busca", root).addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      f.nome = e.target.value.trim();
      f.pagina = 0;
      carregarTabela();
    }, 300);
  });

  $("#ordenar", root).addEventListener("change", (e) => {
    f.ordenar = e.target.value;
    f.pagina = 0;
    carregarTabela();
  });

  $(".pager__btns", root).addEventListener("click", (e) => {
    const b = e.target.closest("[data-pag]");
    if (!b || b.disabled) return;
    f.pagina += Number(b.dataset.pag);
    carregarTabela();
    $(".table-wrap", root).scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  carregarResumo();
  carregarTabela();

  return () => clearTimeout(debounce);
}
