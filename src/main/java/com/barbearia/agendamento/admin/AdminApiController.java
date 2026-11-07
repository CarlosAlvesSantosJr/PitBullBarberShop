package com.barbearia.agendamento.admin;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.barbearia.agendamento.admin.AdminService.AgendaDiaResponse;
import com.barbearia.agendamento.admin.AdminService.PaginaRelatorio;
import com.barbearia.agendamento.admin.AdminService.ResumoRelatorio;
import com.barbearia.agendamento.agendamento.AgendaPolicy;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.AgendamentoResponse;
import com.barbearia.agendamento.model.Agendamento.StatusAgendamento;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Acesso restrito a ROLE_ADMIN (ver SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
@Tag(name = "Administração", description = "Agenda do dia e relatórios (somente admin)")
public class AdminApiController {

    private final AdminService adminService;

    public AdminApiController(AdminService adminService) {
        this.adminService = adminService;
    }

    @Operation(summary = "Agenda de um dia (padrão: hoje) com resumo")
    @GetMapping("/agenda")
    public AgendaDiaResponse agenda(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return adminService.agendaDoDia(data != null ? data : AgendaPolicy.hoje());
    }

    @Operation(summary = "Marcar atendimento como concluído")
    @PostMapping("/agendamentos/{id}/concluir")
    public AgendamentoResponse concluir(@PathVariable Integer id) {
        return adminService.alterarStatus(id, StatusAgendamento.Concluído);
    }

    @Operation(summary = "Cancelar agendamento")
    @PostMapping("/agendamentos/{id}/cancelar")
    public AgendamentoResponse cancelar(@PathVariable Integer id) {
        return adminService.alterarStatus(id, StatusAgendamento.Cancelado);
    }

    @Operation(summary = "Relatório paginado. status: AGENDADO|CONCLUIDO|CANCELADO; ordenar: recentes|antigos|servico")
    @GetMapping("/relatorio")
    public PaginaRelatorio relatorio(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String nome,
            @RequestParam(defaultValue = "recentes") String ordenar,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho) {
        return adminService.relatorio(status, nome, ordenar, pagina, tamanho);
    }

    @Operation(summary = "Totais por status e serviços mais feitos")
    @GetMapping("/relatorio/resumo")
    public ResumoRelatorio resumo() {
        return adminService.resumo();
    }

    @Operation(summary = "Exportar relatório filtrado em PDF")
    @GetMapping("/relatorio/pdf")
    public ResponseEntity<byte[]> pdf(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String nome,
            @RequestParam(defaultValue = "recentes") String ordenar) {
        StringBuilder filtros = new StringBuilder();
        if (status != null && !status.isBlank()) {
            filtros.append("status ").append(status.toLowerCase());
        }
        if (nome != null && !nome.isBlank()) {
            filtros.append(filtros.isEmpty() ? "" : ", ").append("cliente \"").append(nome.trim()).append('"');
        }
        byte[] pdf = RelatorioPdf.gerar(adminService.relatorioCompleto(status, nome, ordenar), filtros.toString());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("relatorio-agendamentos.pdf").build().toString())
                .body(pdf);
    }
}
