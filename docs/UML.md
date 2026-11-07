# Diagramas UML — Pitbull Barber

Diagramas em [Mermaid](https://mermaid.js.org/) (o GitHub renderiza direto).

- [Casos de uso](#casos-de-uso)
- [Classes — domínio](#classes--domínio)
- [Classes — serviços da API](#classes--serviços-da-api)
- [Sequência — login](#sequência--login-por-e-mail-e-senha)
- [Sequência — novo agendamento](#sequência--novo-agendamento)
- [Sequência — login com Google](#sequência--login-com-google)
- [Sequência — admin conclui atendimento](#sequência--admin-conclui-atendimento)
- [Estados do agendamento](#estados-do-agendamento)
- [Componentes do front](#componentes-do-front)
- [Modelo de dados (ER)](#modelo-de-dados-er)

---

## Casos de uso

```mermaid
flowchart LR
  C(("Cliente"))
  A(("Barbeiro<br/>admin"))
  G(("Google"))
  M(("Gmail"))

  subgraph Sistema["Pitbull Barber"]
    UC1(["Criar conta"])
    UC2(["Entrar (e-mail/senha)"])
    UC3(["Entrar com Google"])
    UC4(["Agendar horário"])
    UC5(["Ver próximos e histórico"])
    UC6(["Cancelar agendamento"])
    UC7(["Ver localização / WhatsApp"])
    UC8(["Instalar app (PWA)"])
    UC9(["Ver agenda do dia"])
    UC10(["Concluir / cancelar atendimento"])
    UC11(["Consultar relatório"])
    UC12(["Exportar PDF"])
    UC13(["Enviar confirmação por e-mail"])
  end

  C --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8
  A --- UC2 & UC9 & UC10 & UC11 & UC12
  UC3 -.-> G
  UC4 -. "inclui" .-> UC13
  UC13 -.-> M
  UC12 -. "estende" .-> UC11
```

## Classes — domínio

```mermaid
classDiagram
  direction LR

  class Usuario {
    Integer idUsuario
    String emailUsuario
    String senhaUsuario  «BCrypt ou GOOGLE_LOGIN»
  }
  class Permissao {
    Integer idPermissao
    TipoPermissao tipoPermissao
  }
  class TipoPermissao {
    <<enumeration>>
    ADMIN
    CLIENTE
    USER
  }
  class Cliente {
    Integer idCliente
    String nomeCliente
    String telefoneCliente  «opcional»
    String emailCliente
  }
  class Funcionario {
    Integer idFuncionario
    String nomeFuncionario
    String funcaoFuncionario
    String emailFuncionario
    String telefoneFuncionario
  }
  class Servico {
    Integer idCorte
    String nomeCorte
    String categoria
    String descricao
    BigDecimal valorCorte
    Long duracaoCorte
  }
  class Agendamento {
    Integer idAgendamento
    LocalDate dataAgendamento
    LocalTime horaAgendamento
    StatusAgendamento statusAgendamento
    String observacaoAgendamento
    String formaPagamento
  }
  class StatusAgendamento {
    <<enumeration>>
    Agendado
    Concluído
    Cancelado
  }

  Usuario "*" --> "1" Permissao
  Usuario "*" --> "0..1" Cliente : perfil cliente
  Usuario "*" --> "0..1" Funcionario : perfil barbeiro
  Permissao --> TipoPermissao
  Agendamento "*" --> "1" Cliente
  Agendamento "*" --> "1" Servico
  Agendamento "*" --> "0..1" Funcionario
  Agendamento --> StatusAgendamento
  Funcionario "*" -- "*" Servico : tbl_funcionario_servico
```

## Classes — serviços da API

```mermaid
classDiagram
  direction TB

  class AuthApiController {
    +login(LoginRequest) UsuarioResponse
    +cadastro(CadastroRequest) UsuarioResponse
    +me() UsuarioResponse
  }
  class AuthService {
    +autenticar(LoginRequest) Usuario
    +cadastrar(CadastroRequest) Usuario
    +usuarioGoogle(email, nome) Usuario
    +paraResposta(Usuario) UsuarioResponse
  }
  class SessaoService {
    +abrirSessao(Usuario, req, res)
    +usuarioAtual() Usuario
  }
  class AgendamentoApiController {
    +calendario() CalendarioResponse
    +disponibilidade(data) DisponibilidadeResponse
    +meus() List~AgendamentoResponse~
    +agendar(NovoAgendamentoRequest) AgendamentoResponse
    +cancelar(id) AgendamentoResponse
  }
  class AgendamentoService {
    +calendario()
    +disponibilidade(data)
    +agendar(Cliente, req)
    +doCliente(Cliente)
    +cancelarDoCliente(Cliente, id)
  }
  class AgendaPolicy {
    <<utilitário>>
    +grade() List~LocalTime~
    +diaReservavel(data) boolean
    +horarioValido(hora) boolean
  }
  class AdminApiController {
    +agenda(data) AgendaDiaResponse
    +concluir(id)
    +cancelar(id)
    +relatorio(status, nome, ordenar, pagina)
    +resumo()
    +pdf(status, nome, ordenar)
  }
  class AdminService
  class RelatorioPdf {
    <<utilitário>>
    +gerar(itens, filtros) byte[]
  }
  class ServicoApiController {
    +listar() List~ServicoResponse~
  }
  class AgendamentoCriadoEvent {
    <<record>>
    email
    nomeCliente
    servico
    data
    hora
  }
  class NotificacaoListener {
    +aoCriarAgendamento(evento) «@Async, após commit»
  }
  class EmailService {
    +enviarEmail(para, assunto, msg)
  }
  class OAuth2LoginSuccessHandler
  class ApiExceptionHandler

  AuthApiController --> AuthService
  AuthApiController --> SessaoService
  OAuth2LoginSuccessHandler --> AuthService
  OAuth2LoginSuccessHandler --> SessaoService
  AgendamentoApiController --> AgendamentoService
  AgendamentoApiController --> SessaoService
  AgendamentoService ..> AgendaPolicy
  AgendamentoService ..> AgendamentoCriadoEvent : publica
  NotificacaoListener ..> AgendamentoCriadoEvent : escuta
  NotificacaoListener --> EmailService
  AdminApiController --> AdminService
  AdminApiController ..> RelatorioPdf
```

## Sequência — login por e-mail e senha

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant F as SPA (auth.js)
  participant S as Spring Security
  participant C as AuthApiController
  participant A as AuthService
  participant SS as SessaoService
  participant DB as PostgreSQL

  F->>S: GET /api/auth/me
  S-->>F: 401 + cookie XSRF-TOKEN
  U->>F: e-mail + senha
  F->>S: POST /api/auth/login (header X-XSRF-TOKEN)
  S->>C: CSRF ok
  C->>A: autenticar()
  A->>DB: busca usuário por e-mail
  alt senha em BCrypt
    A->>A: BCrypt.matches
  else senha antiga em texto
    A->>A: compara e converte para BCrypt
    A->>DB: UPDATE senha
  end
  C->>SS: abrirSessao() — troca o id da sessão
  SS->>DB: grava sessão (spring_session)
  C-->>F: 200 {nome, perfil}
  F->>F: perfil ADMIN → #/admin, senão #/inicio
```

## Sequência — novo agendamento

```mermaid
sequenceDiagram
  autonumber
  actor C as Cliente
  participant F as SPA (agendar.js)
  participant API as AgendamentoApiController
  participant SV as AgendamentoService
  participant DB as PostgreSQL
  participant N as NotificacaoListener
  participant M as Gmail

  par ao abrir a tela
    F->>API: GET /api/servicos
    F->>API: GET /api/agendamentos/calendario
  end
  C->>F: escolhe serviço
  F->>F: abre o calendário automaticamente
  C->>F: escolhe o dia
  F->>API: GET /disponibilidade?data=...
  API->>DB: horários ocupados (exceto cancelados)
  API-->>F: 16 horários com livre/ocupado
  F->>F: abre os horários automaticamente
  C->>F: escolhe horário → Confirmar
  F->>API: POST /api/agendamentos
  API->>SV: agendar()
  SV->>SV: valida data, grade e serviço
  SV->>DB: INSERT (índice único de horário ativo)
  alt horário já tomado
    DB-->>SV: violação de índice
    SV-->>F: 409 "Esse horário acabou de ser reservado"
    F->>API: recarrega horários
  else sucesso
    SV->>SV: publica AgendamentoCriadoEvent
    SV-->>F: 201 agendamento
    F->>C: tela "Horário marcado!"
    Note over SV,N: após o commit, em outra thread
    N->>M: e-mail de confirmação
  end
```

## Sequência — login com Google

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant F as SPA
  participant S as Spring Security (OAuth2)
  participant G as Google
  participant H as OAuth2LoginSuccessHandler
  participant A as AuthService
  participant SS as SessaoService

  U->>F: "Continuar com Google"
  F->>S: GET /oauth2/authorization/google
  S-->>U: redirect para o Google
  U->>G: autoriza
  G-->>S: /login/oauth2/code/google?code=...
  S->>G: troca code por token + perfil
  S->>H: onAuthenticationSuccess
  H->>A: usuarioGoogle(email, nome) — busca ou cria cliente
  H->>SS: abrirSessao() com o perfil do banco
  H-->>U: redirect /#/inicio (ou /#/admin)
```

## Sequência — admin conclui atendimento

```mermaid
sequenceDiagram
  autonumber
  actor B as Barbeiro
  participant F as SPA (admin.js)
  participant API as AdminApiController
  participant SV as AdminService
  participant DB as PostgreSQL

  F->>API: GET /api/admin/agenda?data=hoje
  API->>SV: agendaDoDia()
  SV->>DB: agendamentos do dia (+ cliente, serviço)
  API-->>F: resumo + lista
  B->>F: "Concluir" → confirma no diálogo
  F->>API: POST /api/admin/agendamentos/{id}/concluir
  API->>SV: alterarStatus(Concluído)
  alt já concluído/cancelado
    SV-->>F: 409
  else
    SV->>DB: UPDATE status
    SV-->>F: 200
    F->>API: GET /api/admin/agenda (atualiza totais e faturado)
  end
```

## Estados do agendamento

```mermaid
stateDiagram-v2
  state "Concluído" as Concluido
  [*] --> Agendado: cliente confirma
  Agendado --> Concluido: admin conclui
  Agendado --> Cancelado: cliente cancela (só futuro)
  Agendado --> Cancelado: admin cancela
  Concluido --> [*]
  Cancelado --> [*]: horário volta a ficar livre
  note right of Agendado
    Ocupa o horário (índice único
    parcial em data + hora)
  end note
  note right of Concluido
    Entra no Faturado do dia
  end note
```

## Componentes do front

```mermaid
flowchart TB
  IDX["index.html"] --> MAIN["main.js<br/>roteador · guarda de rotas · PWA"]
  MAIN --> API["api.js<br/>fetch + CSRF + 401"]
  MAIN --> UI["ui.js<br/>ícones · formatação · toast · diálogo"]
  MAIN -. "import() sob demanda" .-> V1["views/auth.js"]
  MAIN -.-> V2["views/inicio.js"]
  MAIN -.-> V3["views/agendar.js"]
  MAIN -.-> V4["views/admin.js"]
  MAIN -.-> V5["views/relatorio.js"]
  V1 & V2 & V3 & V4 & V5 --> API
  V1 & V2 & V3 & V4 & V5 --> UI
  SW["sw.js<br/>service worker"] -. "cache do app" .-> IDX
```

## Modelo de dados (ER)

```mermaid
erDiagram
  tbl_permissoes ||--o{ tbl_usuarios : "perfil"
  tbl_clientes |o--o{ tbl_usuarios : "conta do cliente"
  tbl_funcionarios |o--o{ tbl_usuarios : "conta do barbeiro"
  tbl_clientes ||--o{ tbl_agendamento : "agenda"
  tbl_servicos ||--o{ tbl_agendamento : "serviço"
  tbl_funcionarios |o--o{ tbl_agendamento : "atende"
  tbl_funcionarios ||--o{ tbl_funcionario_servico : ""
  tbl_servicos ||--o{ tbl_funcionario_servico : ""
  tbl_agendamento ||--o| tbl_chegada : "reservado"
  tbl_agendamento ||--o| tbl_tempo_atendimento : "reservado"
  tbl_usuarios ||--o{ tbl_log_acessos : "reservado"
  spring_session ||--o{ spring_session_attributes : ""

  tbl_permissoes {
    serial id_permissao PK
    varchar tipo_permissao "USER | ADMIN"
  }
  tbl_usuarios {
    serial id_usuario PK
    varchar email_usuario UK
    varchar senha_usuario "BCrypt"
    int id_permissao FK
    int id_cliente FK "opcional"
    int id_funcionario FK "opcional"
  }
  tbl_clientes {
    serial id_cliente PK
    varchar nome_cliente
    varchar telefone_cliente UK "opcional"
    varchar email_cliente UK
  }
  tbl_funcionarios {
    serial id_funcionario PK
    varchar nome_funcionario
    varchar funcao_funcionario
    varchar email_funcionario
    varchar telefone_funcionario
  }
  tbl_servicos {
    serial id_corte PK
    varchar nome_corte
    varchar categoria "Cabelo | Barba | Combo"
    varchar descricao
    decimal valor_corte
    bigint duracao_corte "minutos"
  }
  tbl_agendamento {
    serial id_agendamento PK
    int id_cliente FK
    int id_corte FK
    int id_funcionario FK "opcional"
    date data_agendamento
    time hora_agendamento
    varchar status_agendamento "Agendado | Concluído | Cancelado"
    text observacao_agendamento
    varchar forma_pagamento "não usado ainda"
  }
  tbl_funcionario_servico {
    int id_funcionario PK, FK
    int id_corte PK, FK
  }
  tbl_chegada {
    serial id_chegada PK
    int id_agendamento FK, UK
    time hora_chegada
    time hora_saida
    varchar status_chegada
  }
  tbl_tempo_atendimento {
    serial id_atendimento PK
    int id_agendamento FK, UK
    time hora_inicio
    time hora_termino
    int duracao_atendimento
  }
  tbl_log_acessos {
    serial id_log PK
    int id_usuario FK
    date data_acesso
    time hora_acesso
    varchar tipo_acesso
    varchar ip_acesso
  }
  spring_session {
    char primary_id PK
    char session_id UK
    bigint expiry_time
    varchar principal_name
  }
  spring_session_attributes {
    char session_primary_id PK, FK
    varchar attribute_name PK
    bytea attribute_bytes
  }
```

> Índice único parcial `ux_agendamento_horario_ativo` em `tbl_agendamento (data_agendamento, hora_agendamento)
> WHERE status_agendamento <> 'Cancelado'`. As tabelas marcadas "reservado" existem no banco para
> evoluções futuras (check-in, tempo de atendimento, auditoria) e ainda não são usadas pelo código.
