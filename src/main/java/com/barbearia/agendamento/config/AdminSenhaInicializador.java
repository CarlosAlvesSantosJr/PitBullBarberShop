package com.barbearia.agendamento.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.barbearia.agendamento.repository.UsuarioRepository;

/**
 * Em ambientes publicados (Docker/Kubernetes), a senha do admin vem da variável
 * ADMIN_SENHA em vez do valor padrão da migration V12. Sem a variável, nada muda.
 */
@Component
public class AdminSenhaInicializador implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSenhaInicializador.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String senha;

    public AdminSenhaInicializador(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
            @Value("${ADMIN_EMAIL:arthur@gmail.com}") String email,
            @Value("${ADMIN_SENHA:}") String senha) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.senha = senha;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (senha == null || senha.isBlank()) {
            return;
        }
        usuarioRepository.findByEmailUsuarioIgnoreCase(email).ifPresent(u -> {
            if (!passwordEncoder.matches(senha, u.getSenhaUsuario())) {
                u.setSenhaUsuario(passwordEncoder.encode(senha));
                log.info("Senha do admin {} definida a partir de ADMIN_SENHA.", email);
            }
        });
    }
}
