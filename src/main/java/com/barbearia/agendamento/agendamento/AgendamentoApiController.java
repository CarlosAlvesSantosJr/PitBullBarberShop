package com.barbearia.agendamento.agendamento;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.barbearia.agendamento.agendamento.AgendamentoDtos.AgendamentoResponse;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.CalendarioResponse;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.DisponibilidadeResponse;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.NovoAgendamentoRequest;
import com.barbearia.agendamento.auth.SessaoService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/agendamentos")
@Tag(name = "Agendamentos", description = "Agenda do cliente logado")
public class AgendamentoApiController {

    private final AgendamentoService agendamentoService;
    private final SessaoService sessaoService;

    public AgendamentoApiController(AgendamentoService agendamentoService, SessaoService sessaoService) {
        this.agendamentoService = agendamentoService;
        this.sessaoService = sessaoService;
    }

    @Operation(summary = "Dias reserváveis e quantos horários livres cada um tem")
    @GetMapping("/calendario")
    public CalendarioResponse calendario() {
        return agendamentoService.calendario();
    }

    @Operation(summary = "Horários de um dia, marcando os ocupados")
    @GetMapping("/disponibilidade")
    public DisponibilidadeResponse disponibilidade(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return agendamentoService.disponibilidade(data);
    }

    @Operation(summary = "Agendamentos do cliente logado (mais recentes primeiro)")
    @GetMapping("/meus")
    public List<AgendamentoResponse> meus() {
        return agendamentoService.doCliente(sessaoService.usuarioAtual().getCliente());
    }

    @Operation(summary = "Criar agendamento")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AgendamentoResponse agendar(@RequestBody NovoAgendamentoRequest req) {
        return agendamentoService.agendar(sessaoService.usuarioAtual().getCliente(), req);
    }

    @Operation(summary = "Cliente cancela um agendamento futuro (o horário volta a ficar livre)")
    @PostMapping("/{id}/cancelar")
    public AgendamentoResponse cancelar(@PathVariable Integer id) {
        return agendamentoService.cancelarDoCliente(sessaoService.usuarioAtual().getCliente(), id);
    }
}
