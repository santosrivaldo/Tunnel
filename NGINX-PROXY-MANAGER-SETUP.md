# 🔧 Configuração com Nginx Proxy Manager

## 📋 Pré-requisitos

- Nginx Proxy Manager já instalado e funcionando
- Docker e Docker Compose instalados
- Domínio configurado (ex: tunnel.suadominio.io)

## 🚀 Passo a Passo

### 1. Parar o Nginx do Tunnel SaaS

```bash
# Usar a configuração sem nginx
docker-compose -f docker-compose-proxy-manager.yml down
```

### 2. Iniciar apenas os serviços essenciais

```bash
# Iniciar sem nginx
docker-compose -f docker-compose-proxy-manager.yml up -d
```

### 3. Configurar no Nginx Proxy Manager

#### 3.1. Acesse seu Nginx Proxy Manager
- URL: `http://seu-ip:81`
- Login com suas credenciais

#### 3.2. Criar Proxy Host para API

1. **Proxy Hosts** → **Add Proxy Host**
2. **Details Tab:**
   - **Domain Names**: `api.tunnel.suadominio.io`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `tunnel_app_1` (nome do container)
   - **Forward Port**: `3000`
   - **Cache Assets**: ✅
   - **Block Common Exploits**: ✅
   - **Websockets Support**: ✅

3. **SSL Tab:**
   - **SSL Certificate**: Let's Encrypt
   - **Force SSL**: ✅
   - **HTTP/2 Support**: ✅

#### 3.3. Criar Proxy Host para Frontend

1. **Proxy Hosts** → **Add Proxy Host**
2. **Details Tab:**
   - **Domain Names**: `tunnel.suadominio.io`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `tunnel_client_1` (nome do container)
   - **Forward Port**: `80`
   - **Cache Assets**: ✅
   - **Block Common Exploits**: ✅
   - **Websockets Support**: ✅

3. **SSL Tab:**
   - **SSL Certificate**: Let's Encrypt
   - **Force SSL**: ✅
   - **HTTP/2 Support**: ✅

#### 3.4. Criar Proxy Host para Túneis (Wildcard)

1. **Proxy Hosts** → **Add Proxy Host**
2. **Details Tab:**
   - **Domain Names**: `*.tunnel.suadominio.io`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `tunnel_app_1`
   - **Forward Port**: `3000`
   - **Cache Assets**: ❌
   - **Block Common Exploits**: ✅
   - **Websockets Support**: ✅

3. **SSL Tab:**
   - **SSL Certificate**: Let's Encrypt
   - **Force SSL**: ✅
   - **HTTP/2 Support**: ✅

### 4. Atualizar variáveis de ambiente

```bash
# Editar docker-compose-proxy-manager.yml
# Alterar REACT_APP_SERVER_URL para usar o domínio real
REACT_APP_SERVER_URL=https://api.tunnel.suadominio.io
```

### 5. Rebuild do cliente

```bash
# Rebuild com as novas configurações
docker-compose -f docker-compose-proxy-manager.yml build --no-cache client
docker-compose -f docker-compose-proxy-manager.yml up -d client
```

## 🔍 Verificação

### Testar conectividade:

```bash
# Testar API
curl https://api.tunnel.suadominio.io/api/health

# Testar Frontend
curl https://tunnel.suadominio.io

# Testar WebSocket (no browser console)
# Deve conectar sem erros
```

### Verificar logs:

```bash
# Logs gerais
docker-compose -f docker-compose-proxy-manager.yml logs -f

# Logs específicos
docker-compose -f docker-compose-proxy-manager.yml logs -f app
docker-compose -f docker-compose-proxy-manager.yml logs -f client
```

## 🌐 URLs Finais

- **Frontend**: https://tunnel.suadominio.io
- **API**: https://api.tunnel.suadominio.io
- **Túneis**: https://seu-tunel.tunnel.suadominio.io

## 🔧 Troubleshooting

### Problema: 502 Bad Gateway
```bash
# Verificar se containers estão rodando
docker-compose -f docker-compose-proxy-manager.yml ps

# Verificar logs
docker-compose -f docker-compose-proxy-manager.yml logs app
```

### Problema: WebSocket não conecta
- Verificar se "Websockets Support" está habilitado no Nginx Proxy Manager
- Verificar se o domínio está correto nas variáveis de ambiente

### Problema: SSL não funciona
- Verificar se o domínio está apontando para o servidor
- Verificar se o Let's Encrypt está funcionando
- Aguardar alguns minutos para propagação DNS

## 📊 Monitoramento

```bash
# Status dos containers
docker-compose -f docker-compose-proxy-manager.yml ps

# Uso de recursos
docker stats

# Logs em tempo real
docker-compose -f docker-compose-proxy-manager.yml logs -f
```
