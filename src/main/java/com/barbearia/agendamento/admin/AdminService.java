package com.barbearia.agendamento.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.barbearia.agendamento.agendamento.AgendamentoDtos;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.AgendamentoResponse;
import com.barbearia.agendamento.common.RegraNegocioException;
import com.barbearia.agendamento.model.Agendamento;
import com.barbearia.agendamento.model.Agendamento.StatusAgendamento;
import com.barbearia.agendamento.repository.AgendamentoRepository;

@Service
public class AdminService {

    public record ResumoDia(int total, int agendados, int concluidos, int cancelados, BigDecimal faturamento) {
    }

    public record AgendaDiaResponse(LocalDate data, ResumoDia resumo, List<AgendamentoResponse> itens) {
    }

    public record PaginaRelatorio(List<AgendamentoResponse> itens, int pagina, int totalPaginas, long totalItens) {
    }

    public record RankingItem(String servico, long total) {
    }

    public record ResumoRelatorio(Map<String, Long> porStatus, List<RankingItem> ranking) {
    }

    private final AgendamentoRepository agendamentoRepository;

    public AdminService(AgendamentoRepository agendamentoRepository) {
        this.agendamentoRepository = agendamentoRepository;
    }

    @Transactional(readOnly = true)
    public AgendaDiaResponse agendaDoDia(LocalDate data) {
        List<Agendamento> doDia = agendamentoRepository.findByDataAgendamentoOrderByHoraAgendamentoAsc(data);
        int agendados = 0, concluidos = 0, cancelados = 0;
        BigDecimal faturamento = BigDecimal.ZERO;
        for (Agendamento a : doDia) {
            switch (a.getStatusAgendamento()) {
                case Agendado -> agendados++;
                case Concluído -> {
                    concluidos++;
                    faturamento = faturamento.add(a.getServico().getValorCorte());
                }
                case Cancelado -> cancelados++;
            }
        }
        List<AgendamentoResponse> itens = doDia.stream()
                .map(a -> AgendamentoResponse.de(a, a.getStatusAgendamento() == StatusAgendamento.Agendado))
                .toList();
        return new AgendaDiaResponse(data,
                new ResumoDia(doDia.size(), agendados, concluidos, cancelados, faturamento), itens);
    }

    @Transactional
    public AgendamentoResponse alterarStatus(Integer id, StatusAgendamento novo) {
        Agendamento a = agendamentoRepository.findById(id)
                .orElseThrow(() -> RegraNegocioException.naoEncontrado("Agendamento não encontrado."));
        if (a.getStatusAgendamento() != StatusAgendamento.Agendado) {
            throw RegraNegocioException.conflito("Este agendamento já foi "
                    + (a.getStatusAgendamento() == StatusAgendamento.Cancelado ? "cancelado." : "concluído."));
        }
        a.setStatusAgendamento(novo);
        return AgendamentoResponse.de(a, false);
    }

    @Transactional(readOnly = true)
    public PaginaRelatorio relatorio(String status, String nome, String ordenar, int pagina, int tamanho) {
        int tam = Math.min(Math.max(tamanho, 5), 100);
        PageRequest req = PageRequest.of(Math.max(pagina, 0), tam, ordenacao(ordenar));
        Page<Agendamento> page = agendamentoRepository.findAll(filtro(status, nome), req);
        return new PaginaRelatorio(
                page.getContent().stream().map(a -> AgendamentoResponse.de(a, false)).toList(),
                page.getNumber(), page.getTotalPages(), page.getTotalElements());
    }

    /** Lista completa (sem paginação) para exportação em PDF. */
    @Transactional(readOnly = true)
    public List<AgendamentoResponse> relatorioCompleto(String status, String nome, String ordenar) {
        return agendamentoRepository.findAll(filtro(status, nome), ordenacao(ordenar)).stream()
                .map(a -> AgendamentoResponse.de(a, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumoRelatorio resumo() {
        Map<String, Long> porStatus = new LinkedHashMap<>();
        porStatus.put("AGENDADO", 0L);
        porStatus.put("CONCLUIDO", 0L);
        porStatus.put("CANCELADO", 0L);
        for (Object[] l : agendamentoRepository.totalPorStatus()) {
            porStatus.put(AgendamentoDtos.codigoStatus((StatusAgendamento) l[0]), (Long) l[1]);
        }
        List<RankingItem> ranking = new ArrayList<>();
        for (Object[] l : agendamentoRepository.rankingServicos(StatusAgendamento.Cancelado)) {
            ranking.add(new RankingItem((String) l[0], (Long) l[1]));
        }
        return new ResumoRelatorio(porStatus, ranking);
    }

    private static Sort ordenacao(String ordenar) {
        if ("antigos".equalsIgnoreCase(ordenar)) {
            return Sort.by("dataAgendamento", "horaAgendamento").ascending();
        }
        if ("servico".equalsIgnoreCase(ordenar)) {
            return Sort.by("servico.nomeCorte").ascending()
                    .and(Sort.by("dataAgendamento", "horaAgendamento").descending());
        }
        return Sort.by("dataAgendamento", "horaAgendamento").descending();
    }

    private static Specification<Agendamento> filtro(String status, String nome) {
        StatusAgendamento s = AgendamentoDtos.statusDoCodigo(status);
        String termo = nome == null ? "" : nome.trim().toLowerCase();
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> p = new ArrayList<>();
            if (s != null) {
                p.add(cb.equal(root.get("statusAgendamento"), s));
            }
            if (!termo.isEmpty()) {
                p.add(cb.like(cb.lower(root.get("cliente").get("nomeCliente")), "%" + termo + "%"));
            }
            return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
