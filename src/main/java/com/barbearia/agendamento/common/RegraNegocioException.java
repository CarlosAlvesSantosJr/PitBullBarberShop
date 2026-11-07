package com.barbearia.agendamento.common;

import org.springframework.http.HttpStatus;

/** Erro de regra de negócio que vira uma resposta JSON com status e mensagem legível. */
public class RegraNegocioException extends RuntimeException {

    private final HttpStatus status;

    public RegraNegocioException(HttpStatus status, String mensagem) {
        super(mensagem);
        this.status = status;
    }

    public static RegraNegocioException invalido(String mensagem) {
        return new RegraNegocioException(HttpStatus.BAD_REQUEST, mensagem);
    }

    public static RegraNegocioException naoEncontrado(String mensagem) {
        return new RegraNegocioException(HttpStatus.NOT_FOUND, mensagem);
    }

    public static RegraNegocioException conflito(String mensagem) {
        return new RegraNegocioException(HttpStatus.CONFLICT, mensagem);
    }

    public static RegraNegocioException proibido(String mensagem) {
        return new RegraNegocioException(HttpStatus.FORBIDDEN, mensagem);
    }

    public static RegraNegocioException naoAutenticado(String mensagem) {
        return new RegraNegocioException(HttpStatus.UNAUTHORIZED, mensagem);
    }

    public HttpStatus getStatus() {
        return status;
    }
}
