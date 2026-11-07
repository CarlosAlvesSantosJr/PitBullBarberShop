package com.barbearia.agendamento.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.barbearia.agendamento.auth.AuthDtos.CadastroRequest;
import com.barbearia.agendamento.auth.AuthDtos.LoginRequest;
import com.barbearia.agendamento.auth.AuthDtos.UsuarioResponse;
import com.barbearia.agendamento.model.Usuario;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Logout é tratado pelo Spring Security em POST /api/auth/logout. */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticação", description = "Login, cadastro e sessão do usuário")
public class AuthApiController {

    private final AuthService authService;
    private final SessaoService sessaoService;

    public AuthApiController(AuthService authService, SessaoService sessaoService) {
        this.authService = authService;
        this.sessaoService = sessaoService;
    }

    @Operation(summary = "Entrar com e-mail e senha")
    @PostMapping("/login")
    public UsuarioResponse login(@RequestBody LoginRequest req, HttpServletRequest request,
            HttpServletResponse response) {
        Usuario usuario = authService.autenticar(req);
        sessaoService.abrirSessao(usuario, request, response);
        return authService.paraResposta(usuario);
    }

    @Operation(summary = "Criar conta de cliente (já entra logado)")
    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse cadastro(@RequestBody CadastroRequest req, HttpServletRequest request,
            HttpServletResponse response) {
        Usuario usuario = authService.cadastrar(req);
        sessaoService.abrirSessao(usuario, request, response);
        return authService.paraResposta(usuario);
    }

    @Operation(summary = "Usuário da sessão atual (401 se não logado)")
    @GetMapping("/me")
    public UsuarioResponse me() {
        return authService.paraResposta(sessaoService.usuarioAtual());
    }
}
