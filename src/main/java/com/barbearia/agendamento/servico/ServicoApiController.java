package com.barbearia.agendamento.servico;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.barbearia.agendamento.model.Servico;
import com.barbearia.agendamento.repository.ServicoRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/servicos")
@Tag(name = "Serviços", description = "Catálogo de serviços da barbearia")
public class ServicoApiController {

    public record ServicoResponse(Integer id, String nome, String categoria, String descricao,
            BigDecimal valor, Long duracaoMinutos) {

        static ServicoResponse de(Servico s) {
            return new ServicoResponse(s.getIdCorte(), s.getNomeCorte(), s.getCategoria(), s.getDescricao(),
                    s.getValorCorte(), s.getDuracaoCorte());
        }
    }

    private final ServicoRepository servicoRepository;

    public ServicoApiController(ServicoRepository servicoRepository) {
        this.servicoRepository = servicoRepository;
    }

    @Operation(summary = "Lista os serviços (muda pouco: o navegador pode guardar por 5 min)")
    @GetMapping
    public ResponseEntity<List<ServicoResponse>> listar() {
        List<ServicoResponse> servicos = servicoRepository.findAll(Sort.by("idCorte")).stream()
                .map(ServicoResponse::de)
                .toList();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePrivate())
                .body(servicos);
    }
}
