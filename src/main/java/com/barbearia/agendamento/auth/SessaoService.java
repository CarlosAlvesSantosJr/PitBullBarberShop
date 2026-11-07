package com.barbearia.agendamento.auth;

import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

import com.barbearia.agendamento.common.RegraNegocioException;
import com.barbearia.agendamento.model.Usuario;
import com.barbearia.agendamento.repository.UsuarioRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Ponto único de sessão: abre a sessão autenticada (login por senha ou Google)
 * e resolve o usuário logado a partir dela.
 */
@Service
public class SessaoService {

    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();
    private final UsuarioRepository usuarioRepository;

    public SessaoService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Autentica o usuário na sessão HTTP, trocando o id da sessão (evita session fixation). */
    public void abrirSessao(Usuario usuario, HttpServletRequest request, HttpServletResponse response) {
        String role = "ROLE_" + usuario.getPermissao().getTipoPermissao().name();
        Authentication auth = new UsernamePasswordAuthenticationToken(
                usuario.getEmailUsuario(), null, List.of(new SimpleGrantedAuthority(role)));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);

        request.getSession(true);
        request.changeSessionId();
        contextRepository.saveContext(context, request, response);
    }

    /** Usuário logado, sempre lido do banco (nada de entidade velha guardada na sessão). */
    public Usuario usuarioAtual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof String email)
                || "anonymousUser".equals(email)) {
            throw RegraNegocioException.naoAutenticado("Faça login para continuar.");
        }
        return usuarioRepository.findByEmailUsuario(email)
                .orElseThrow(() -> RegraNegocioException.naoAutenticado("Sessão expirada. Entre novamente."));
    }
}
