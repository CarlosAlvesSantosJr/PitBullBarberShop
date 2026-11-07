package com.barbearia.agendamento.agendamento;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Regras de funcionamento da agenda num lugar só.
 * Atendimento das 14:00 às 21:30 (último horário), de 30 em 30 minutos,
 * reservas a partir de amanhã e até {@link #JANELA_DIAS} dias à frente.
 */
public final class AgendaPolicy {

    public static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    public static final LocalTime ABERTURA = LocalTime.of(14, 0);
    public static final LocalTime ULTIMO_HORARIO = LocalTime.of(21, 30);
    public static final int INTERVALO_MINUTOS = 30;
    public static final int JANELA_DIAS = 60;

    private static final List<LocalTime> GRADE;

    static {
        List<LocalTime> grade = new ArrayList<>();
        for (LocalTime t = ABERTURA; !t.isAfter(ULTIMO_HORARIO); t = t.plusMinutes(INTERVALO_MINUTOS)) {
            grade.add(t);
        }
        GRADE = Collections.unmodifiableList(grade);
    }

    private AgendaPolicy() {
    }

    public static LocalDate hoje() {
        return LocalDate.now(FUSO);
    }

    public static LocalDate primeiroDiaReservavel() {
        return hoje().plusDays(1);
    }

    public static LocalDate ultimoDiaReservavel() {
        return hoje().plusDays(JANELA_DIAS);
    }

    public static boolean diaReservavel(LocalDate data) {
        return !data.isBefore(primeiroDiaReservavel()) && !data.isAfter(ultimoDiaReservavel());
    }

    public static List<LocalTime> grade() {
        return GRADE;
    }

    public static boolean horarioValido(LocalTime hora) {
        return GRADE.contains(hora);
    }
}
