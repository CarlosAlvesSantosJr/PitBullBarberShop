# API REST — Pitbull Barber

Base: `/api`. Formato JSON. Datas `YYYY-MM-DD`, horas `HH:mm[:ss]`.
Documentação interativa (Swagger) em `/swagger-ui/index.html` com o app rodando.

## Convenções

- **Sessão:** após login/cadastro o servidor devolve o cookie `SESSION` (HttpOnly). O navegador envia sozinho.
- **CSRF:** toda requisição que não seja `GET` precisa do header `X-XSRF-TOKEN` com o valor do cookie
  `XSRF-TOKEN` (emitido em qualquer resposta, ex.: `GET /api/auth/me`).
- **Erros:** sempre `{"erro": "mensagem legível"}` com o status adequado.

| Status | Quando |
|---|---|
| 400 | dados inválidos (data fora da janela, horário fora da grade…) |
| 401 | não logado / sessão expirada / senha incorreta |
| 403 | sem permissão (ex.: cliente em `/api/admin`) ou CSRF ausente |
| 404 | recurso não encontrado |
| 409 | conflito (horário acabou de ser reservado, e-mail já cadastrado, status já alterado) |

## Autenticação — `/api/auth`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/me` | público | usuário da sessão (401 se não logado) |
| POST | `/login` | público | entrar com e-mail e senha |
| POST | `/cadastro` | público | criar conta de cliente (já entra logado) — `201` |
| POST | `/logout` | logado | encerra a sessão — `204` |
| GET | `/oauth2/authorization/google` | público | inicia o login com Google (fora de `/api`) |

```http
POST /api/auth/login
X-XSRF-TOKEN: 3f0c…
Content-Type: application/json

{ "email": "joao@email.com", "senha": "minhasenha" }
```
```json
{ "nome": "João Silva", "email": "joao@email.com", "telefone": "(48) 99999-0000", "perfil": "CLIENTE" }
```

`POST /cadastro` → `{ "nome", "telefone", "email", "senha" }` (telefone com DDD; senha ≥ 6).

## Serviços — `/api/servicos`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/servicos` | público | catálogo (cache privado de 5 min) |

```json
[{ "id": 2, "nome": "Corte Degradê", "categoria": "Cabelo",
   "descricao": "Degradê moderno com transição suave…", "valor": 30.00, "duracaoMinutos": 30 }]
```

## Agendamentos do cliente — `/api/agendamentos`

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/calendario` | logado | dias reserváveis (amanhã → +60) com horários livres |
| GET | `/disponibilidade?data=2026-11-08` | logado | 16 horários do dia com `disponivel` |
| GET | `/meus` | cliente | agendamentos do cliente (mais recentes primeiro) |
| POST | `/` | cliente | cria agendamento — `201` / `409` se o horário foi tomado |
| POST | `/{id}/cancelar` | cliente (dono) | cancela agendamento futuro |

```http
POST /api/agendamentos
{ "servicoId": 2, "data": "2026-11-08", "hora": "15:30" }
```
```json
{ "id": 8, "data": "2026-11-08", "hora": "15:30:00", "status": "AGENDADO", "podeCancelar": true,
  "servico": "Corte Degradê", "valor": 30.00, "duracaoMinutos": 30,
  "cliente": "João Silva", "telefone": "(48) 99999-0000" }
```

`status`: `AGENDADO` | `CONCLUIDO` | `CANCELADO`.

## Administração — `/api/admin` (somente `ROLE_ADMIN`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/agenda?data=2026-11-08` | agenda do dia (padrão: hoje) + resumo |
| POST | `/agendamentos/{id}/concluir` | marca como concluído |
| POST | `/agendamentos/{id}/cancelar` | cancela |
| GET | `/relatorio?status=&nome=&ordenar=recentes&pagina=0&tamanho=10` | lista paginada e filtrada |
| GET | `/relatorio/resumo` | totais por status + ranking de serviços |
| GET | `/relatorio/pdf?status=&nome=&ordenar=` | exporta o relatório filtrado em PDF |

`ordenar`: `recentes` (padrão) | `antigos` | `servico`.

```json
// GET /api/admin/agenda?data=2026-11-08
{ "data": "2026-11-08",
  "resumo": { "total": 4, "agendados": 3, "concluidos": 1, "cancelados": 0, "faturamento": 30.00 },
  "itens": [ { "id": 21, "hora": "14:00:00", "cliente": "João Silva", "servico": "Corte Degradê", "status": "CONCLUIDO" } ] }
```

## Infra

| Rota | Descrição |
|---|---|
| `/actuator/health/liveness` | processo vivo (probe do Kubernetes) |
| `/actuator/health/readiness` | pronto para receber tráfego |
| `/barbearia/**` | rotas antigas: redirecionam para as telas novas |
