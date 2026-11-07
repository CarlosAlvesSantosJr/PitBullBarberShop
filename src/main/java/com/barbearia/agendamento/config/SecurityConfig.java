package com.barbearia.agendamento.config;

import java.io.IOException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Segurança do app (front SPA + API REST no mesmo domínio).
 * - Sessão HTTP com cookie HttpOnly; o front nunca guarda credencial.
 * - CSRF: o token vai no cookie XSRF-TOKEN e o front devolve no header X-XSRF-TOKEN.
 * - /api/admin/** só para ROLE_ADMIN; demais /api/** exigem login (401 em JSON, sem redirect).
 * Para a variante stateless com JWT, rode com o profile "jwt" (ver SecurityConfigJwt).
 */
@Configuration
@Profile("!jwt")
public class SecurityConfig {

    private final OAuth2LoginSuccessHandler oauth2SuccessHandler;

    public SecurityConfig(OAuth2LoginSuccessHandler oauth2SuccessHandler) {
        this.oauth2SuccessHandler = oauth2SuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class)

                .authorizeHttpRequests(auth -> auth
                        // front estático
                        .requestMatchers("/", "/index.html", "/app/**", "/imagens/**", "/favicon.ico",
                                "/manifest.webmanifest", "/sw.js", "/offline.html", "/error").permitAll()
                        // health checks do Kubernetes
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // rotas antigas (/barbearia/...) só redirecionam para o app novo
                        .requestMatchers("/barbearia", "/barbearia/**").permitAll()
                        // API pública
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/cadastro").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me", "/api/servicos").permitAll()
                        // login Google
                        .requestMatchers("/oauth2/**", "/login/**").permitAll()
                        // documentação
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        // área administrativa
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())

                .exceptionHandling(e -> e.defaultAuthenticationEntryPointFor(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED), new AntPathRequestMatcher("/api/**")))

                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())

                .oauth2Login(oauth -> oauth
                        .loginPage("/")
                        .successHandler(oauth2SuccessHandler)
                        .failureUrl("/#/entrar?erro=google"))

                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("SESSION", "JSESSIONID"));

        return http.build();
    }

    /** Garante que o cookie XSRF-TOKEN seja emitido já na primeira resposta. */
    static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                FilterChain chain) throws ServletException, IOException {
            CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (token != null) {
                token.getToken();
            }
            chain.doFilter(request, response);
        }
    }
}
