# Deploy — Pitbull Barber

Front (PWA) + API Spring Boot + PostgreSQL. Sessões ficam no banco, então o app roda com várias réplicas.

## Kubernetes (Docker Desktop)

```bash
# 1. imagem
docker build -t pitbull-barber:1.3 .

# 2. segredos (uma vez; NÃO ficam no repositório)
kubectl apply -f k8s/namespace.yaml
kubectl -n pitbull create secret generic pitbull-segredos \
  --from-literal=DB_SENHA='<senha-do-banco>' \
  --from-literal=ADMIN_SENHA='<senha-do-admin>' \
  --from-literal=GOOGLE_CLIENT_ID='<client-id>' \
  --from-literal=GOOGLE_CLIENT_SECRET='<client-secret>' \
  --from-literal=MAIL_USUARIO='<gmail>' \
  --from-literal=MAIL_SENHA='<senha-de-app-do-gmail>'

# 3. sobe banco + app (2 réplicas)
kubectl apply -k k8s/
kubectl -n pitbull rollout status deployment/pitbull-app
```

App em **http://localhost:8090**. Para publicar uma versão nova: gere a imagem com outra tag
(ex.: `pitbull-barber:1.4`), troque a tag em `k8s/app.yaml` e rode `kubectl apply -k k8s/`
(atualização gradual, sem derrubar o app).

| Comando | Para quê |
|---|---|
| `kubectl -n pitbull get pods` | ver se está tudo rodando |
| `kubectl -n pitbull logs -l app=pitbull-app -f` | logs do app |
| `kubectl -n pitbull scale deployment/pitbull-app --replicas=3` | mais réplicas |
| `kubectl delete namespace pitbull` | remove tudo (inclusive o banco do cluster) |

## Acesso externo (HTTPS, necessário para instalar o PWA)

```bash
cloudflared tunnel --url http://localhost:8090
```
Gera um link `https://….trycloudflare.com` (muda a cada execução). Para um endereço fixo,
crie um túnel nomeado na sua conta Cloudflare com um domínio próprio.

**Login com Google pelo link externo:** cadastre `https://<seu-dominio>/login/oauth2/code/google`
como URI de redirecionamento autorizado no Google Cloud Console.

## Só Docker (sem Kubernetes)

```bash
cp .env.example .env   # preencha as senhas
docker compose up -d --build
```
App em http://localhost:8090.

## PWA

Ao mudar arquivos do front, aumente `VERSAO` em `src/main/resources/static/sw.js`
para os celulares baixarem a versão nova.
