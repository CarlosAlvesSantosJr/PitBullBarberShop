package com.barbearia.agendamento.agendamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.barbearia.agendamento.model.Agendamento;
import com.barbearia.agendamento.model.Agendamento.StatusAgendamento;

/** Contratos JSON do módulo de agendamento. */
public final class AgendamentoDtos {

    private AgendamentoDtos() {
    }

    public record NovoAgendamentoRequest(Integer servicoId, LocalDate data, LocalTime hora) {
    }

    public record HorarioResponse(LocalTime hora, boolean disponivel) {
    }

    public record DisponibilidadeResponse(LocalDate data, List<HorarioResponse> horarios) {
    }

    public record DiaCalendarioResponse(LocalDate data, int livres) {
    }

    public record CalendarioResponse(LocalDate primeiroDia, LocalDate ultimoDia, int horariosPorDia,
            List<DiaCalendarioResponse> dias) {
    }

    /** status: AGENDADO | CONCLUIDO | CANCELADO */
    public record AgendamentoResponse(Integer id, LocalDate data, LocalTime hora, String status,
            boolean podeCancelar, String servico, BigDecimal valor, Long duracaoMinutos,
            String cliente, String telefone) {

        public static AgendamentoResponse de(Agendamento a, boolean podeCancelar) {
            return new AgendamentoResponse(
                    a.getIdAgendamento(),
                    a.getDataAgendamento(),
                    a.getHoraAgendamento(),
                    codigoStatus(a.getStatusAgendamento()),
                    podeCancelar,
                    a.getServico().getNomeCorte(),
                    a.getServico().getValorCorte(),
                    a.getServico().getDuracaoCorte(),
                    a.getCliente().getNomeCliente(),
                    a.getCliente().getTelefoneCliente());
        }
    }

    public static String codigoStatus(StatusAgendamento s) {
        return switch (s) {
            case Agendado -> "AGENDADO";
            case Concluído -> "CONCLUIDO";
            case Cancelado -> "CANCELADO";
        };
    }

    /** Aceita AGENDADO / CONCLUIDO / CANCELADO (ou vazio = todos). */
    public static StatusAgendamento statusDoCodigo(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            return null;
        }
        return switch (codigo.trim().toUpperCase()) {
            case "AGENDADO" -> StatusAgendamento.Agendado;
            case "CONCLUIDO", "CONCLUÍDO" -> StatusAgendamento.Concluído;
            case "CANCELADO" -> StatusAgendamento.Cancelado;
            default -> null;
        };
    }
}
