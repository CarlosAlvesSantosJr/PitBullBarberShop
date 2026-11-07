package com.barbearia.agendamento.repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.barbearia.agendamento.model.Agendamento;
import com.barbearia.agendamento.model.Agendamento.StatusAgendamento;

@Repository
public interface AgendamentoRepository
        extends JpaRepository<Agendamento, Integer>, JpaSpecificationExecutor<Agendamento> {

    /** Horários já tomados num dia (cancelados liberam o horário). */
    @Query("SELECT a.horaAgendamento FROM Agendamento a "
            + "WHERE a.dataAgendamento = :data AND a.statusAgendamento <> :ignorar")
    List<LocalTime> horariosOcupados(@Param("data") LocalDate data, @Param("ignorar") StatusAgendamento ignorar);

    boolean existsByDataAgendamentoAndHoraAgendamentoAndStatusAgendamentoNot(
            LocalDate data, LocalTime hora, StatusAgendamento status);

    /** Quantidade de agendamentos ativos por dia, para pintar o calendário. */
    @Query("SELECT a.dataAgendamento, COUNT(a) FROM Agendamento a "
            + "WHERE a.dataAgendamento BETWEEN :inicio AND :fim AND a.statusAgendamento <> :ignorar "
            + "GROUP BY a.dataAgendamento")
    List<Object[]> ocupacaoPorDia(@Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim,
            @Param("ignorar") StatusAgendamento ignorar);

    @EntityGraph(attributePaths = { "servico" })
    @Query("SELECT a FROM Agendamento a WHERE a.cliente.idCliente = :idCliente "
            + "ORDER BY a.dataAgendamento DESC, a.horaAgendamento DESC")
    List<Agendamento> doCliente(@Param("idCliente") Integer idCliente);

    @EntityGraph(attributePaths = { "cliente", "servico" })
    List<Agendamento> findByDataAgendamentoOrderByHoraAgendamentoAsc(LocalDate data);

    @Query("SELECT a.servico.nomeCorte, COUNT(a) FROM Agendamento a "
            + "WHERE a.statusAgendamento <> :ignorar "
            + "GROUP BY a.servico.nomeCorte ORDER BY COUNT(a) DESC")
    List<Object[]> rankingServicos(@Param("ignorar") StatusAgendamento ignorar);

    @Query("SELECT a.statusAgendamento, COUNT(a) FROM Agendamento a GROUP BY a.statusAgendamento")
    List<Object[]> totalPorStatus();

    int deleteByDataAgendamentoBefore(LocalDate limite);
}
