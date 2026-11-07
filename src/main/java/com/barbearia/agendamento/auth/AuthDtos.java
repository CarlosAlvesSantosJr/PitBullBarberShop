package com.barbearia.agendamento.auth;

/** Contratos JSON do módulo de autenticação. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(String email, String senha) {
    }

    public record CadastroRequest(String nome, String telefone, String email, String senha) {
    }

    /** perfil: "ADMIN" ou "CLIENTE" (é o que o front usa para escolher a tela). */
    public record UsuarioResponse(String nome, String email, String telefone, String perfil) {
    }
}
