package com.barbearia.agendamento.config;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.barbearia.agendamento.auth.AuthService;
import com.barbearia.agendamento.auth.SessaoService;
import com.barbearia.agendamento.model.Permissao.TipoPermissao;
import com.barbearia.agendamento.model.Usuario;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Depois do login Google: busca/cria o cliente e troca a autenticação OAuth2
 * pela sessão padrão do app (mesmo formato do login por senha, com o perfil do banco).
 */
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;
    private final SessaoService sessaoService;

    public OAuth2LoginSuccessHandler(AuthService authService, SessaoService sessaoService) {
        this.authService = authService;
        this.sessaoService = sessaoService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        String email = token.getPrincipal().getAttribute("email");
        String nome = token.getPrincipal().getAttribute("name");

        if (email == null || email.isBlank()) {
            response.sendRedirect("/#/entrar?erro=google");
            return;
        }

        Usuario usuario = authService.usuarioGoogle(email, nome);
        sessaoService.abrirSessao(usuario, request, response);

        boolean admin = usuario.getPermissao().getTipoPermissao() == TipoPermissao.ADMIN;
        response.sendRedirect(admin ? "/#/admin" : "/#/inicio");
    }
}
