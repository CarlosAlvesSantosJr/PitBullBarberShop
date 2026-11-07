package com.barbearia.agendamento.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.barbearia.agendamento.auth.AuthDtos.CadastroRequest;
import com.barbearia.agendamento.auth.AuthDtos.LoginRequest;
import com.barbearia.agendamento.auth.AuthDtos.UsuarioResponse;
import com.barbearia.agendamento.common.RegraNegocioException;
import com.barbearia.agendamento.model.Cliente;
import com.barbearia.agendamento.model.Permissao;
import com.barbearia.agendamento.model.Permissao.TipoPermissao;
import com.barbearia.agendamento.model.Usuario;
import com.barbearia.agendamento.repository.ClienteRepository;
import com.barbearia.agendamento.repository.PermissaoRepository;
import com.barbearia.agendamento.repository.UsuarioRepository;

@Service
public class AuthService {

    /** Marcador de conta criada pelo Google: não tem senha local. */
    public static final String SENHA_GOOGLE = "GOOGLE_LOGIN";

    private static final String EMAIL_REGEX = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final PermissaoRepository permissaoRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UsuarioRepository usuarioRepository, ClienteRepository clienteRepository,
            PermissaoRepository permissaoRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
        this.permissaoRepository = permissaoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Usuario autenticar(LoginRequest req) {
        String email = req.email() == null ? "" : req.email().trim().toLowerCase();
        String senha = req.senha() == null ? "" : req.senha();
        if (email.isEmpty() || senha.isEmpty()) {
            throw RegraNegocioException.invalido("Informe e-mail e senha.");
        }

        Usuario usuario = usuarioRepository.findByEmailUsuarioIgnoreCase(email)
                .orElseThrow(() -> RegraNegocioException.naoAutenticado("E-mail ou senha incorretos."));

        String salva = usuario.getSenhaUsuario();
        if (SENHA_GOOGLE.equals(salva)) {
            throw RegraNegocioException.naoAutenticado("Esta conta usa o login com Google.");
        }

        if (ehBcrypt(salva)) {
            if (!passwordEncoder.matches(senha, salva)) {
                throw RegraNegocioException.naoAutenticado("E-mail ou senha incorretos.");
            }
        } else {
            // Contas antigas guardavam a senha em texto puro: confere e já converte para BCrypt.
            if (!salva.equals(senha)) {
                throw RegraNegocioException.naoAutenticado("E-mail ou senha incorretos.");
            }
            usuario.setSenhaUsuario(passwordEncoder.encode(senha));
        }
        return usuario;
    }

    @Transactional
    public Usuario cadastrar(CadastroRequest req) {
        String nome = req.nome() == null ? "" : req.nome().trim();
        String email = req.email() == null ? "" : req.email().trim().toLowerCase();
        String telefone = formatarTelefone(req.telefone());
        String senha = req.senha() == null ? "" : req.senha();

        if (nome.length() < 2) {
            throw RegraNegocioException.invalido("Informe seu nome.");
        }
        if (telefone == null) {
            throw RegraNegocioException.invalido("Telefone inválido. Informe DDD + número.");
        }
        if (!email.matches(EMAIL_REGEX)) {
            throw RegraNegocioException.invalido("E-mail inválido.");
        }
        if (senha.length() < 6) {
            throw RegraNegocioException.invalido("A senha deve ter pelo menos 6 caracteres.");
        }
        if (usuarioRepository.findByEmailUsuarioIgnoreCase(email).isPresent()
                || clienteRepository.findByEmailClienteIgnoreCase(email).isPresent()) {
            throw RegraNegocioException.conflito("Este e-mail já está cadastrado.");
        }
        if (clienteRepository.findByTelefoneCliente(telefone).isPresent()) {
            throw RegraNegocioException.conflito("Este telefone já está cadastrado.");
        }

        Cliente cliente = new Cliente();
        cliente.setNomeCliente(nome);
        cliente.setTelefoneCliente(telefone);
        cliente.setEmailCliente(email);
        clienteRepository.save(cliente);

        Usuario usuario = new Usuario();
        usuario.setEmailUsuario(email);
        usuario.setSenhaUsuario(passwordEncoder.encode(senha));
        usuario.setCliente(cliente);
        usuario.setPermissao(permissaoCliente());
        return usuarioRepository.save(usuario);
    }

    /** Busca ou cria o cliente/usuário de quem entrou pelo Google. */
    @Transactional
    public Usuario usuarioGoogle(String email, String nome) {
        String emailNorm = email.trim().toLowerCase();
        return usuarioRepository.findByEmailUsuarioIgnoreCase(emailNorm).orElseGet(() -> {
            Cliente cliente = clienteRepository.findByEmailClienteIgnoreCase(emailNorm).orElseGet(() -> {
                Cliente novo = new Cliente();
                novo.setNomeCliente(nome != null && !nome.isBlank() ? nome : emailNorm);
                novo.setEmailCliente(emailNorm);
                return clienteRepository.save(novo);
            });
            Usuario novo = new Usuario();
            novo.setEmailUsuario(emailNorm);
            novo.setSenhaUsuario(SENHA_GOOGLE);
            novo.setCliente(cliente);
            novo.setPermissao(permissaoCliente());
            return usuarioRepository.save(novo);
        });
    }

    public UsuarioResponse paraResposta(Usuario usuario) {
        boolean admin = usuario.getPermissao().getTipoPermissao() == TipoPermissao.ADMIN;
        String nome;
        String telefone = null;
        if (usuario.getCliente() != null) {
            nome = usuario.getCliente().getNomeCliente();
            telefone = usuario.getCliente().getTelefoneCliente();
        } else if (usuario.getFuncionario() != null) {
            nome = usuario.getFuncionario().getNomeFuncionario();
        } else {
            nome = usuario.getEmailUsuario();
        }
        return new UsuarioResponse(nome, usuario.getEmailUsuario(), telefone, admin ? "ADMIN" : "CLIENTE");
    }

    private Permissao permissaoCliente() {
        // As migrations cadastram o perfil de cliente como USER.
        return permissaoRepository.findFirstByTipoPermissao(TipoPermissao.CLIENTE)
                .or(() -> permissaoRepository.findFirstByTipoPermissao(TipoPermissao.USER))
                .orElseThrow(() -> new IllegalStateException("Perfil de cliente não cadastrado no banco."));
    }

    private static boolean ehBcrypt(String valor) {
        return valor != null && valor.matches("^\\$2[aby]?\\$\\d{2}\\$.{53}$");
    }

    /** Normaliza para "(11) 99999-9999" / "(11) 9999-9999"; null se inválido. */
    static String formatarTelefone(String bruto) {
        if (bruto == null) {
            return null;
        }
        String d = bruto.replaceAll("\\D", "");
        if (d.length() == 11) {
            return "(" + d.substring(0, 2) + ") " + d.substring(2, 7) + "-" + d.substring(7);
        }
        if (d.length() == 10) {
            return "(" + d.substring(0, 2) + ") " + d.substring(2, 6) + "-" + d.substring(6);
        }
        return null;
    }
}
