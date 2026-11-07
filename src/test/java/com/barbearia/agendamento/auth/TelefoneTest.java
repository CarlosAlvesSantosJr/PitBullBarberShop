package com.barbearia.agendamento.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TelefoneTest {

    @Test
    void normalizaCelularEFixo() {
        assertThat(AuthService.formatarTelefone("48999998888")).isEqualTo("(48) 99999-8888");
        assertThat(AuthService.formatarTelefone("(48) 9999-8888")).isEqualTo("(48) 9999-8888");
        assertThat(AuthService.formatarTelefone(" 48 9 9999 8888 ")).isEqualTo("(48) 99999-8888");
    }

    @Test
    void rejeitaTamanhoInvalido() {
        assertThat(AuthService.formatarTelefone("999")).isNull();
        assertThat(AuthService.formatarTelefone("489999988887")).isNull();
        assertThat(AuthService.formatarTelefone(null)).isNull();
    }
}
