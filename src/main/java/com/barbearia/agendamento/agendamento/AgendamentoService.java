package com.barbearia.agendamento.agendamento;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.barbearia.agendamento.agendamento.AgendamentoDtos.AgendamentoResponse;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.CalendarioResponse;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.DiaCalendarioResponse;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.DisponibilidadeResponse;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.HorarioResponse;
import com.barbearia.agendamento.agendamento.AgendamentoDtos.NovoAgendamentoRequest;
import com.barbearia.agendamento.common.RegraNegocioException;
import com.barbearia.agendamento.model.Agendamento;
import com.barbearia.agendamento.model.Agendamento.StatusAgendamento;
import com.barbearia.agendamento.model.Cliente;
import com.barbearia.agendamento.model.Servico;
import com.barbearia.agendamento.repository.AgendamentoRepository;
import com.barbearia.agendamento.repository.ServicoRepository;

@Service
public class AgendamentoService {

    private final AgendamentoRepository agendamentoRepository;
    private final ServicoRepository servicoRepository;
    private final ApplicationEventPublisher eventos;

    public AgendamentoService(AgendamentoRepository agendamentoRepository, ServicoRepository servicoRepository,
            ApplicationEventPublisher eventos) {
        this.agendamentoRepository = agendamentoRepository;
        this.servicoRepository = servicoRepository;
        this.eventos = eventos;
    }

    /** Dias reserváveis com a quantidade de horários livres em cada um. */
    @Transactional(readOnly = true)
    public CalendarioResponse calendario() {
        LocalDate inicio = AgendaPolicy.primeiroDiaReservavel();
        LocalDate fim = AgendaPolicy.ultimoDiaReservavel();
        int porDia = AgendaPolicy.grade().size();

        Map<LocalDate, Long> ocupados = new HashMap<>();
        for (Object[] linha : agendamentoRepository.ocupacaoPorDia(inicio, fim, StatusAgendamento.Cancelado)) {
            ocupados.put((LocalDate) linha[0], (Long) linha[1]);
        }

        List<DiaCalendarioResponse> dias = inicio.datesUntil(fim.plusDays(1))
                .map(d -> new DiaCalendarioResponse(d, (int) Math.max(0, porDia - ocupados.getOrDefault(d, 0L))))
                .toList();
        return new CalendarioResponse(inicio, fim, porDia, dias);
    }

    @Transactional(readOnly = true)
    public DisponibilidadeResponse disponibilidade(LocalDate data) {
        if (!AgendaPolicy.diaReservavel(data)) {
            throw RegraNegocioException.invalido("Escolha uma data entre amanhã e os próximos "
                    + AgendaPolicy.JANELA_DIAS + " dias.");
        }
        Set<LocalTime> ocupados = new HashSet<>(
                agendamentoRepository.horariosOcupados(data, StatusAgendamento.Cancelado));
        List<HorarioResponse> horarios = AgendaPolicy.grade().stream()
                .map(h -> new HorarioResponse(h, !ocupados.contains(h)))
                .toList();
        return new DisponibilidadeResponse(data, horarios);
    }

    @Transactional
    public AgendamentoResponse agendar(Cliente cliente, NovoAgendamentoRequest req) {
        if (cliente == null) {
            throw RegraNegocioException.proibido("Somente clientes podem agendar.");
        }
        if (req.servicoId() == null || req.data() == null || req.hora() == null) {
            throw RegraNegocioException.invalido("Escolha serviço, data e horário.");
        }
        if (!AgendaPolicy.diaReservavel(req.data())) {
            throw RegraNegocioException.invalido("Data indisponível para agendamento.");
        }
        if (!AgendaPolicy.horarioValido(req.hora())) {
            throw RegraNegocioException.invalido("Horário fora do funcionamento da barbearia.");
        }
        Servico servico = servicoRepository.findById(req.servicoId())
                .orElseThrow(() -> RegraNegocioException.naoEncontrado("Serviço não encontrado."));

        if (agendamentoRepository.existsByDataAgendamentoAndHoraAgendamentoAndStatusAgendamentoNot(
                req.data(), req.hora(), StatusAgendamento.Cancelado)) {
            throw RegraNegocioException.conflito("Esse horário acabou de ser reservado. Escolha outro.");
        }

        Agendamento agendamento = new Agendamento();
        agendamento.setCliente(cliente);
        agendamento.setServico(servico);
        agendamento.setDataAgendamento(req.data());
        agendamento.setHoraAgendamento(req.hora());

        try {
            agendamentoRepository.saveAndFlush(agendamento);
        } catch (DataIntegrityViolationException e) {
            // Índice único no banco: outro cliente confirmou o mesmo horário no mesmo instante.
            throw RegraNegocioException.conflito("Esse horário acabou de ser reservado. Escolha outro.");
        }

        eventos.publishEvent(new AgendamentoCriadoEvent(cliente.getEmailCliente(), cliente.getNomeCliente(),
                servico.getNomeCorte(), req.data(), req.hora()));

        return AgendamentoResponse.de(agendamento, true);
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> doCliente(Cliente cliente) {
        if (cliente == null) {
            return List.of();
        }
        return agendamentoRepository.doCliente(cliente.getIdCliente()).stream()
                .map(a -> AgendamentoResponse.de(a, podeCancelar(a)))
                .toList();
    }

    @Transactional
    public AgendamentoResponse cancelarDoCliente(Cliente cliente, Integer id) {
        Agendamento a = agendamentoRepository.findById(id)
                .orElseThrow(() -> RegraNegocioException.naoEncontrado("Agendamento não encontrado."));
        if (cliente == null || !a.getCliente().getIdCliente().equals(cliente.getIdCliente())) {
            throw RegraNegocioException.proibido("Este agendamento não é seu.");
        }
        if (!podeCancelar(a)) {
            throw RegraNegocioException.invalido("Este agendamento não pode mais ser cancelado.");
        }
        a.setStatusAgendamento(StatusAgendamento.Cancelado);
        return AgendamentoResponse.de(a, false);
    }

    private static boolean podeCancelar(Agendamento a) {
        LocalDateTime quando = LocalDateTime.of(a.getDataAgendamento(), a.getHoraAgendamento());
        return a.getStatusAgendamento() == StatusAgendamento.Agendado
                && quando.isAfter(LocalDateTime.now(AgendaPolicy.FUSO));
    }
}
