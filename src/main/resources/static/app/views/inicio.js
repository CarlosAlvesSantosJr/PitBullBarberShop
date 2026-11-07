import {
  esc, icon, $, $$, topbar, primeiroNome, dateBadge, statusPill, fmtHora, fmtMoeda,
  dataLonga, confirmar, comLoading, toast, waLink,
} from "../ui.js";

const LAT = -28.425856364663854;
const LNG = -48.960435218019235;
const mapaEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${LNG - 0.006}%2C${LAT - 0.004}%2C${LNG + 0.006}%2C${LAT + 0.004}&layer=mapnik&marker=${LAT}%2C${LNG}`;
const mapaGoogle = `https://www.google.com/maps?q=${LAT},${LNG}`;

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const ehFuturo = (a) => a.status === "AGENDADO" && new Date(`${a.data}T${fmtHora(a.hora)}`) > new Date();

export function render({ root, user, api }) {
  let aba = "proximos";
  let lista = [];

  root.innerHTML = `
    ${topbar(user)}
    <div class="container page">
      <section class="hero" aria-labelledby="titulo">
        <div>
          <p class="eyebrow">${saudacao()}</p>
          <h1 id="titulo" class="title-xl">${esc(primeiroNome(user.nome))}, bora dar um trato?</h1>
        </div>
      </section>

      <div class="hero-grid">
        <a class="cta" href="#/agendar">
          <div>
            <h2 class="cta__title">Novo agendamento</h2>
            <p class="cta__text">Escolha o serviço, o dia e o horário. Em três toques está marcado.</p>
          </div>
          <span class="btn btn--primary btn--lg">${icon.plus}Agendar agora</span>
          <span class="cta__icon">${icon.scissors}</span>
        </a>
        <div class="card next" data-proximo aria-live="polite">
          <p class="eyebrow">Seu próximo horário</p>
          <div class="skeleton" style="height:64px"></div>
        </div>
      </div>

      <section class="section" aria-labelledby="titulo-agend">
        <div class="section__head">
          <h2 id="titulo-agend" class="section__title">Seus agendamentos</h2>
          <div class="tabs" role="tablist" aria-label="Filtrar agendamentos">
            <button class="tab" role="tab" id="tab-proximos" aria-controls="painel-agend" aria-selected="true" data-aba="proximos">Próximos<span class="count" data-count="proximos"></span></button>
            <button class="tab" role="tab" id="tab-historico" aria-controls="painel-agend" aria-selected="false" data-aba="historico" tabindex="-1">Histórico<span class="count" data-count="historico"></span></button>
          </div>
        </div>
        <div id="painel-agend" role="tabpanel" aria-labelledby="tab-proximos">
          <ul class="list" data-lista>
            ${'<li class="skeleton" style="height:84px"></li>'.repeat(2)}
          </ul>
        </div>
      </section>

      <section class="section" aria-labelledby="titulo-local">
        <div class="section__head">
          <h2 id="titulo-local" class="section__title">Onde estamos</h2>
        </div>
        <div class="info-grid">
          <iframe class="map" title="Mapa com a localização da Pitbull Barber" loading="lazy" src="${mapaEmbed}"></iframe>
          <div class="card contact">
            <div class="contact__row">${icon.clock}<div><strong>Horário de atendimento</strong>Todos os dias, das 14h às 22h</div></div>
            <div class="contact__row">${icon.pin}<div><strong>Pitbull Barber</strong>Toque no botão abaixo para traçar a rota.</div></div>
            <div class="row mt-2">
              <a class="btn btn--ghost" href="${mapaGoogle}" target="_blank" rel="noopener">${icon.pin}Abrir no Google Maps</a>
              <a class="btn btn--ghost" href="${waLink("Olá! Tenho uma dúvida sobre meu agendamento.")}" target="_blank" rel="noopener">${icon.whatsapp}WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    </div>`;

  const ul = $("[data-lista]", root);
  const painel = $("#painel-agend", root);

  function pintarAbas() {
    $$(".tab", root).forEach((t) => {
      const ativa = t.dataset.aba === aba;
      t.setAttribute("aria-selected", String(ativa));
      t.tabIndex = ativa ? 0 : -1;
    });
    painel.setAttribute("aria-labelledby", `tab-${aba}`);
  }

  function pintarLista() {
    const proximos = lista.filter(ehFuturo).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const historico = lista.filter((a) => !ehFuturo(a));
    $('[data-count="proximos"]', root).textContent = proximos.length ? `(${proximos.length})` : "";
    $('[data-count="historico"]', root).textContent = historico.length ? `(${historico.length})` : "";

    // destaque do próximo horário
    const prox = proximos[0];
    $("[data-proximo]", root).innerHTML = prox
      ? `<p class="eyebrow">Seu próximo horário</p>
         <div class="next__when">${dateBadge(prox.data)}
           <div><div class="appt__title">${esc(prox.servico)}</div>
           <div class="appt__meta"><span>${esc(dataLonga(prox.data))}</span><span>às ${fmtHora(prox.hora)}</span></div></div>
         </div>`
      : `<p class="eyebrow">Seu próximo horário</p>
         <p class="next__empty">Você não tem horário marcado. Que tal agendar agora?</p>`;

    const itens = aba === "proximos" ? proximos : historico;
    if (!itens.length) {
      ul.innerHTML = `<li class="empty">${icon.calendar}
        <strong>${aba === "proximos" ? "Nenhum horário marcado" : "Seu histórico está vazio"}</strong>
        ${aba === "proximos" ? 'Use o <a class="link" href="#/agendar">Novo agendamento</a> para marcar.' : "Seus atendimentos anteriores aparecerão aqui."}
      </li>`;
      return;
    }
    ul.innerHTML = itens.map((a) => `
      <li class="appt" data-id="${a.id}">
        ${dateBadge(a.data)}
        <div class="appt__main">
          <div class="appt__title">${esc(a.servico)}</div>
          <div class="appt__meta"><span>${icon.clock.replace("<svg", '<svg width="14" height="14" style="vertical-align:-2px"')} ${fmtHora(a.hora)}</span><span>${fmtMoeda(a.valor)}</span></div>
        </div>
        <div class="appt__side">
          ${statusPill(a.status)}
          ${a.podeCancelar ? `<button class="btn btn--danger btn--sm" data-cancelar="${a.id}">Cancelar</button>` : ""}
        </div>
      </li>`).join("");
  }

  async function carregar() {
    try {
      lista = await api.meus();
      pintarLista();
    } catch (e) {
      ul.innerHTML = `<li class="alert" role="alert">${icon.alert}<span>${esc(e.message)}</span></li>`;
    }
  }

  root.addEventListener("click", async (e) => {
    const tab = e.target.closest(".tab");
    if (tab) {
      aba = tab.dataset.aba;
      pintarAbas();
      pintarLista();
      return;
    }
    const btn = e.target.closest("[data-cancelar]");
    if (btn) {
      const a = lista.find((x) => String(x.id) === btn.dataset.cancelar);
      const ok = await confirmar({
        titulo: "Cancelar agendamento?",
        texto: `${a.servico} em ${dataLonga(a.data)}, às ${fmtHora(a.hora)}. O horário ficará livre para outra pessoa.`,
        ok: "Sim, cancelar",
        cancelar: "Manter",
        perigo: true,
      });
      if (!ok) return;
      try {
        const atualizado = await comLoading(btn, () => api.cancelarMeu(a.id));
        lista = lista.map((x) => (x.id === atualizado.id ? atualizado : x));
        pintarLista();
        toast("Agendamento cancelado.");
      } catch (err) {
        toast(err.message, "erro");
      }
    }
  });

  // navegação por setas entre as abas (padrão WAI-ARIA)
  $(".tabs", root).addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    aba = aba === "proximos" ? "historico" : "proximos";
    pintarAbas();
    pintarLista();
    $(`[data-aba="${aba}"]`, root).focus();
  });

  carregar();
}
