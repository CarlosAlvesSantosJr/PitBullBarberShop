package com.barbearia.agendamento.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.barbearia.agendamento.model.Permissao;
import com.barbearia.agendamento.model.Permissao.TipoPermissao;

public interface PermissaoRepository extends JpaRepository<Permissao, Integer> {

    Optional<Permissao> findFirstByTipoPermissao(TipoPermissao tipoPermissao);
}
