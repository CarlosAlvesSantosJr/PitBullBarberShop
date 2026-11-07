import {
  esc, icon, $, topbar, statusPill, fmtHora, fmtMoeda, dataLonga, parseData, isoData, confirmar, comLoading, toast,
} from "../ui.js";

export function adminNav(ativo) {
  return `<nav class="nav" aria-label="Área administrativa">
    <a href="#/admin" ${ativo === "agenda" ? 'aria-current="page"' : ""}>Agenda</a>
    <a href="#/admin/relatorio" ${ativo === "relatorio" ? 'aria-current="page"' : ""}>Relatório</a>
  </nav>`;
}

function soDigitos(t) {
  return String(t || "").replace(/\D/g, "");
}

export function render({ root, user, params, go, api }) {
  const hoje = isoData(new Date());
  let data = /^\d{4}-\d{2}-\d{2}$/.test(params.get("data") || "") ? params.get("data") : hoje;
  let agenda = null;

  root.innerHTML = `
    ${topbar(user, { nav: adminNav("agenda") })}
    <div class="container page">
      <div class="section__head">
        <div>
          <p class="eyebrow">Painel do barbeiro</p>
          <h1 class="title-xl">Agenda</h1>
        </div>
        <div class="toolbar">
          <div class="datenav">
            <button class="btn btn--ghost btn--icon" data-dia="-1" aria-label="Dia anterior">${icon.back}</button>
            <label class="sr-only" for="data">Escolher data</label>
            <div class="datenav__label" data-label aria-live="polite"></div>
            <button class="btn btn--ghost btn--icon" data-dia="1" aria-label="Próximo dia">${icon.next}</button>
          </div>
          <input class="input" type="date" id="data" style="width:auto;min-height:44px" />
          <button class="btn btn--ghost" data-hoje>Hoje</button>
        </div>
      </div>

      <div class="stats" data-stats aria-live="polite"></div>
      <ul class="timeline" data-lista></ul>
    </div>`;

  const inputData = $("#data", root);
  const lista = $("[data-lista]", root);

  function mudarData(nova) {
    data = nova;
    // mantém a data na URL (voltar/atualizar preserva o dia) sem recarregar
    history.replaceState(null, "", data === hoje ? "#/admin" : `#/admin?data=${data}`);
    carregar();
  }

  function pintarCabecalho() {
    const longa = dataLonga(data);
    const rotulo = longa.charAt(0).toUpperCase() + longa.slice(1);
    $("[data-label]", root).textContent = data === hoje ? `Hoje · ${rotulo}` : rotulo;
    inputData.value = data;
    $("[data-hoje]", root).disabled = data === hoje;
  }

  function stat(label, valor, ico = "") {
    return `<div class="card stat"><div class="stat__label">${ico}${label}</div><div class="stat__value">${valor}</div></div>`;
  }

  function pintar() {
    const r = agenda.resumo;
    $("[data-stats]", root).innerHTML =
      stat("Total no dia", r.total, icon.calendar) +
      stat("A atender", r.agendados, icon.clock) +
      stat("Concluídos", r.concluidos, icon.check) +
      stat("Cancelados", r.cancelados, icon.x) +
      stat("Faturado", fmtMoeda(r.faturamento), icon.money);

    if (!agenda.itens.length) {
      lista.innerHTML = `<li class="empty">${icon.calendar}<strong>Nenhum agendamento neste dia</strong>Use as setas para ver outros dias.</li>`;
      return;
    }
    lista.innerHTML = agenda.itens.map((a) => {
      const tel = soDigitos(a.telefone);
      return `
      <li class="tl" data-status="${a.status}" data-id="${a.id}">
        <div class="tl__hour">${fmtHora(a.hora)}</div>
        <div>
          <div class="tl__name">${esc(a.cliente)}</div>
          <div class="tl__meta">
            <span>${esc(a.servico)} · ${fmtMoeda(a.valor)}</span>
            ${tel ? `<a href="https://wa.me/55${tel}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(a.cliente)}">${esc(a.telefone)}</a>` : '<span class="muted">sem telefone</span>'}
          </div>
        </div>
        <div class="tl__actions">
          ${a.status === "AGENDADO"
            ? `<button class="btn btn--ok btn--sm" data-acao="concluir">${icon.check}Concluir</button>
               <button class="btn btn--danger btn--sm" data-acao="cancelar">${icon.x}Cancelar</button>`
            : statusPill(a.status)}
        </div>
      </li>`;
    }).join("");
  }

  async function carregar() {
    pintarCabecalho();
    $("[data-stats]", root).innerHTML = '<div class="skeleton" style="height:86px"></div>'.repeat(5);
    lista.innerHTML = '<li class="skeleton" style="height:84px"></li>'.repeat(3);
    const pedida = data;
    try {
      const resp = await api.agendaAdmin(pedida);
      if (pedida !== data) return;
      agenda = resp;
      pintar();
    } catch (e) {
      lista.innerHTML = `<li class="alert" role="alert">${icon.alert}<span>${esc(e.message)}</span></li>`;
      $("[data-stats]", root).innerHTML = "";
    }
  }

  root.addEventListener("click", async (e) => {
    const nav = e.target.closest("[data-dia]");
    if (nav) {
      const d = parseData(data);
      d.setDate(d.getDate() + Number(nav.dataset.dia));
      return mudarData(isoData(d));
    }
    if (e.target.closest("[data-hoje]")) return mudarData(hoje);

    const btn = e.target.closest("[data-acao]");
    if (!btn) return;
    const id = Number(btn.closest("[data-id]").dataset.id);
    const a = agenda.itens.find((x) => x.id === id);
    const concluir = btn.dataset.acao === "concluir";
    const ok = await confirmar(concluir
      ? { titulo: "Concluir atendimento?", texto: `${a.cliente} · ${a.servico} às ${fmtHora(a.hora)}.`, ok: "Concluir" }
      : { titulo: "Cancelar agendamento?", texto: `${a.cliente} · ${a.servico} às ${fmtHora(a.hora)}. O horário volta a ficar livre.`, ok: "Cancelar agendamento", cancelar: "Manter", perigo: true });
    if (!ok) return;
    try {
      await comLoading(btn, () => (concluir ? api.concluir(id) : api.cancelarAdmin(id)));
      toast(concluir ? "Atendimento concluído." : "Agendamento cancelado.");
      const resp = await api.agendaAdmin(data);
      agenda = resp;
      pintar();
    } catch (err) {
      toast(err.message, "erro");
    }
  });

  inputData.addEventListener("change", () => {
    if (inputData.value) mudarData(inputData.value);
  });

  carregar();
}
