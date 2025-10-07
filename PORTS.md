# 🚪 Portas do Sistema Tunnel SaaS

## Portas Mapeadas

| Serviço | Porta Externa | Porta Interna | Descrição |
|---------|---------------|---------------|-----------|
| **App (API)** | 3001 | 3000 | Servidor principal da API |
| **Client (Frontend)** | 3002 | 80 | Interface web React |
| **MongoDB** | 27018 | 27017 | Banco de dados |
| **Redis** | 6380 | 6379 | Cache e sessões |
| **Nginx HTTP** | 8080 | 80 | Proxy reverso HTTP |
| **Nginx HTTPS** | 8443 | 443 | Proxy reverso HTTPS |

## Acesso aos Serviços

### 🌐 Interface Web
- **Frontend**: http://localhost:3002
- **API**: http://localhost:3001
- **Nginx (HTTP)**: http://localhost:8080
- **Nginx (HTTPS)**: https://localhost:8443

### 🗄️ Banco de Dados
- **MongoDB**: localhost:27018
- **Redis**: localhost:6380

## Configuração de Desenvolvimento

### Variáveis de Ambiente
```bash
# Frontend
REACT_APP_SERVER_URL=http://localhost:3001
REACT_APP_BASE_DOMAIN=tunnel.suadominio.io

# Backend
MONGODB_URI=mongodb://mongo:27017/tunnel-saas
```

### Conexões Internas
- **App → MongoDB**: mongo:27017
- **App → Redis**: redis:6379
- **Client → App**: app:3000
- **Nginx → App**: app:3000
- **Nginx → Client**: client:80

## Comandos Úteis

### Iniciar todos os serviços
```bash
docker-compose up -d
```

### Ver logs de um serviço específico
```bash
docker-compose logs -f app
docker-compose logs -f client
docker-compose logs -f mongo
```

### Parar todos os serviços
```bash
docker-compose down
```

### Rebuild de um serviço específico
```bash
docker-compose build app
docker-compose build client
```

## Troubleshooting

### Verificar se as portas estão em uso
```bash
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002
netstat -tulpn | grep :27018
netstat -tulpn | grep :6380
```

### Verificar status dos containers
```bash
docker-compose ps
```

### Acessar logs de erro
```bash
docker-compose logs app
docker-compose logs client
```
