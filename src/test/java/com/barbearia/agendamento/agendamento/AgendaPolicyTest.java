package com.barbearia.agendamento.agendamento;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalTime;

import org.junit.jupiter.api.Test;

import com.barbearia.agendamento.model.Agendamento.StatusAgendamento;

class AgendaPolicyTest {

    @Test
    void gradeVaiDas14hAs21h30DeMeiaEmMeiaHora() {
        assertThat(AgendaPolicy.grade()).hasSize(16);
        assertThat(AgendaPolicy.grade().get(0)).isEqualTo(LocalTime.of(14, 0));
        assertThat(AgendaPolicy.grade().get(15)).isEqualTo(LocalTime.of(21, 30));
    }

    @Test
    void horarioForaDaGradeEhInvalido() {
        assertThat(AgendaPolicy.horarioValido(LocalTime.of(15, 30))).isTrue();
        assertThat(AgendaPolicy.horarioValido(LocalTime.of(10, 0))).isFalse();
        assertThat(AgendaPolicy.horarioValido(LocalTime.of(15, 15))).isFalse();
        assertThat(AgendaPolicy.horarioValido(LocalTime.of(22, 0))).isFalse();
    }

    @Test
    void reservaSoDeAmanhaAteAJanela() {
        var hoje = AgendaPolicy.hoje();
        assertThat(AgendaPolicy.diaReservavel(hoje)).isFalse();
        assertThat(AgendaPolicy.diaReservavel(hoje.plusDays(1))).isTrue();
        assertThat(AgendaPolicy.diaReservavel(hoje.plusDays(AgendaPolicy.JANELA_DIAS))).isTrue();
        assertThat(AgendaPolicy.diaReservavel(hoje.plusDays(AgendaPolicy.JANELA_DIAS + 1))).isFalse();
    }

    @Test
    void codigoDeStatusIdaEVolta() {
        for (StatusAgendamento s : StatusAgendamento.values()) {
            assertThat(AgendamentoDtos.statusDoCodigo(AgendamentoDtos.codigoStatus(s))).isEqualTo(s);
        }
        assertThat(AgendamentoDtos.statusDoCodigo("concluído")).isEqualTo(StatusAgendamento.Concluído);
        assertThat(AgendamentoDtos.statusDoCodigo("")).isNull();
        assertThat(AgendamentoDtos.statusDoCodigo("xyz")).isNull();
    }
}
