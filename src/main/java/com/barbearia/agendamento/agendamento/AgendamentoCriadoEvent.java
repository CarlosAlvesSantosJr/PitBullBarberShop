package com.barbearia.agendamento.agendamento;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Publicado quando um cliente agenda. Quem reage (ex.: e-mail de confirmação)
 * roda depois do commit e fora da requisição, sem atrasar a resposta.
 */
public record AgendamentoCriadoEvent(String email, String nomeCliente, String servico,
        LocalDate data, LocalTime hora) {
}
