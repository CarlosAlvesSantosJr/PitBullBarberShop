package com.barbearia.agendamento.notificacao;

import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import com.barbearia.agendamento.agendamento.AgendamentoCriadoEvent;

/**
 * Envia a confirmação por e-mail em segundo plano, só depois que o agendamento
 * foi gravado. Se o SMTP estiver lento ou fora do ar, o cliente não espera nem vê erro.
 */
@Component
public class NotificacaoListener {

    private static final Logger log = LoggerFactory.getLogger(NotificacaoListener.class);
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final EmailService emailService;

    public NotificacaoListener(EmailService emailService) {
        this.emailService = emailService;
    }

    @Async
    @TransactionalEventListener
    public void aoCriarAgendamento(AgendamentoCriadoEvent e) {
        if (e.email() == null || e.email().isBlank()) {
            return;
        }
        String mensagem = "Olá " + e.nomeCliente() + "!\n\n"
                + "Seu agendamento na Pitbull Barber está confirmado.\n\n"
                + "Serviço: " + e.servico() + "\n"
                + "Data: " + e.data().format(DATA) + "\n"
                + "Horário: " + e.hora().format(HORA) + "\n\n"
                + "Se precisar, você pode cancelar pelo app.\n"
                + "Aguardamos você!";
        try {
            emailService.enviarEmail(e.email(), "Agendamento confirmado - Pitbull Barber", mensagem);
        } catch (Exception ex) {
            log.warn("Falha ao enviar e-mail de confirmação para {}: {}", e.email(), ex.getMessage());
        }
    }
}
