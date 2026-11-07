package com.barbearia.agendamento.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import io.swagger.v3.oas.annotations.Hidden;

/** Mantém links/favoritos antigos (/barbearia/...) funcionando, levando para o app novo. */
@Hidden
@Controller
public class RotasLegadasController {

    @GetMapping({ "/barbearia", "/barbearia/", "/barbearia/index", "/barbearia/login", "/barbearia/loginadm" })
    public String entrar() {
        return "redirect:/#/entrar";
    }

    @GetMapping("/barbearia/cadastro")
    public String cadastro() {
        return "redirect:/#/cadastro";
    }

    @GetMapping({ "/barbearia/servicos", "/barbearia/agendamentos", "/barbearia/horarios" })
    public String inicio() {
        return "redirect:/#/inicio";
    }

    @GetMapping("/barbearia/admin")
    public String admin() {
        return "redirect:/#/admin";
    }

    @GetMapping("/barbearia/relatorio")
    public String relatorio() {
        return "redirect:/#/admin/relatorio";
    }
}
