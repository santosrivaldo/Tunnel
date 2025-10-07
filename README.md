# 🚇 Tunnel SaaS - Sistema de Criação de Túnel Seguro

Um sistema SaaS completo para criação e gerenciamento de túneis seguros com agentes automatizados, permitindo que usuários exponham seus serviços locais na internet sem necessidade de IP fixo ou configuração de firewall.

## ✨ Funcionalidades Principais

### 🔧 Arquitetura
- **Servidor Central**: API REST + painel web hospedado na nuvem
- **Agentes Clientes**: Instalados nas máquinas dos usuários
- **Banco de Dados**: MongoDB para gerenciamento de dados
- **WebSocket**: Comunicação em tempo real entre agentes e servidor
- **TLS/SSL**: Criptografia completa em todas as conexões

### 🌐 Funcionalidades do Sistema
- **Autenticação JWT**: Sistema seguro de login com refresh tokens
- **Multitenancy**: Suporte a domínios dedicados por cliente
- **Planos SaaS**: Sistema de billing com Stripe
- **Rate Limiting**: Controle de uso por usuário
- **Logs em Tempo Real**: Monitoramento completo de atividades

### 🚇 Gerenciamento de Túneis
- **Tipos de Túnel**: HTTP, HTTPS, TCP
- **Subdomínios Únicos**: Cada túnel recebe um subdomínio público
- **Mapeamento de Portas**: Conecta portas locais com URLs públicas
- **Tokens Individuais**: Autenticação segura por agente
- **Reconexão Automática**: Mantém túneis ativos automaticamente

### 🤖 Agentes Automatizados
- **Instalação Simples**: Script de instalação com um comando
- **Multiplataforma**: Suporte para Windows, Linux, macOS
- **Heartbeat**: Monitoramento de status em tempo real
- **Configuração Flexível**: Arquivo de configuração JSON
- **Logs Detalhados**: Rastreamento completo de atividades

### 💳 Sistema de Billing
- **Planos Flexíveis**: Free, Basic, Pro, Enterprise
- **Integração Stripe**: Pagamentos seguros
- **Limites por Plano**: Controle de uso baseado no plano
- **Webhooks**: Atualizações automáticas de status

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- MongoDB 5+
- Go 1.21+ (para o agente)
- Redis (opcional, para cache)

### 1. Configuração do Servidor

```bash
# Clone o repositório
git clone https://github.com/your-org/tunnel-saas.git
cd tunnel-saas

# Instale dependências
npm install

# Configure variáveis de ambiente
cp env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o servidor
npm start
```

### 2. Configuração do Banco de Dados

```bash
# Inicie o MongoDB
mongod

# O servidor criará automaticamente as coleções necessárias
```

### 3. Instalação do Agente

```bash
# Linux/macOS
curl -s https://tunnel.suadominio.io/install.sh | bash

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://tunnel.suadominio.io/install.ps1" -OutFile "install.ps1"
.\install.ps1
```

### 4. Configuração do Frontend

```bash
# Navegue para o diretório do cliente
cd client

# Instale dependências
npm install

# Configure variáveis de ambiente
echo "REACT_APP_SERVER_URL=http://localhost:3000" > .env
echo "REACT_APP_BASE_DOMAIN=tunnel.suadominio.io" >> .env

# Inicie o servidor de desenvolvimento
npm start
```

## 📖 Uso do Sistema

### 1. Criação de Conta
1. Acesse o painel web
2. Registre-se com email e senha
3. Confirme seu email (se configurado)

### 2. Instalação do Agente
1. Crie um agente no painel
2. Copie o token do agente
3. Execute o script de instalação
4. Configure o token quando solicitado

### 3. Criação de Túneis
1. Acesse a seção "Tunnels"
2. Clique em "Create Tunnel"
3. Selecione o agente
4. Configure a porta local
5. Escolha o tipo de túnel
6. Clique em "Create"

### 4. Acesso aos Túneis
- **HTTP**: `https://seu-tunel.tunnel.suadominio.io`
- **TCP**: Conecte-se à porta pública
- **HTTPS**: Certificado SSL automático

## 🔧 Configuração Avançada

### Variáveis de Ambiente

```bash
# Servidor
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/tunnel-saas

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Domínio
BASE_DOMAIN=tunnel.suadominio.io
ADMIN_DOMAIN=admin.suadominio.io

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# Segurança
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Configuração do Agente

```json
{
  "server_url": "wss://tunnel.suadominio.io/ws",
  "token": "your-agent-token",
  "agent_id": "your-agent-id",
  "auto_reconnect": true,
  "heartbeat_interval": 30000,
  "max_reconnect_attempts": 5,
  "reconnect_delay": 5000
}
```

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cliente Web   │    │   Servidor     │    │     Agente     │
│   (React)       │◄──►│   (Node.js)    │◄──►│     (Go)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   MongoDB       │
                       │   (Database)    │
                       └─────────────────┘
```

### Fluxo de Dados
1. **Cliente** cria túnel via API REST
2. **Servidor** valida permissões e cria registro
3. **Agente** recebe comando via WebSocket
4. **Agente** inicia proxy local
5. **Tráfego** é roteado através do túnel

## 🔒 Segurança

### Medidas Implementadas
- **TLS/SSL**: Todas as conexões são criptografadas
- **JWT**: Autenticação segura com refresh tokens
- **Rate Limiting**: Proteção contra ataques de força bruta
- **Validação**: Sanitização de todos os inputs
- **Isolamento**: Cada usuário tem seus próprios recursos

### Boas Práticas
- Use senhas fortes
- Mantenha os agentes atualizados
- Monitore os logs regularmente
- Configure firewalls adequadamente
- Use HTTPS em produção

## 📊 Monitoramento

### Métricas Disponíveis
- **Uptime**: Tempo de atividade dos túneis
- **Tráfego**: Bytes transferidos
- **Conexões**: Número de conexões ativas
- **Latência**: Tempo de resposta
- **Erros**: Taxa de erro por túnel

### Logs
- **Sistema**: Logs do servidor e agentes
- **Aplicação**: Logs de túneis e conexões
- **Segurança**: Logs de autenticação e autorização
- **Performance**: Logs de métricas e alertas

## 🚀 Deploy em Produção

### Docker
```bash
# Build da imagem
docker build -t tunnel-saas .

# Executar container
docker run -d \
  --name tunnel-saas \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://mongo:27017/tunnel-saas \
  tunnel-saas
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/tunnel-saas
    depends_on:
      - mongo
  
  mongo:
    image: mongo:5
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tunnel-saas
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tunnel-saas
  template:
    metadata:
      labels:
        app: tunnel-saas
    spec:
      containers:
      - name: tunnel-saas
        image: tunnel-saas:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          value: "mongodb://mongo:27017/tunnel-saas"
```

## 🤝 Contribuição

### Como Contribuir
1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Abra um Pull Request

### Padrões de Código
- Use ESLint para JavaScript/TypeScript
- Use Prettier para formatação
- Escreva testes para novas funcionalidades
- Documente mudanças na API

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

### Documentação
- [Guia de Início Rápido](docs/quick-start.md)
- [API Reference](docs/api.md)
- [Troubleshooting](docs/troubleshooting.md)

### Contato
- **Email**: support@tunnel.suadominio.io
- **Discord**: [Servidor da Comunidade](https://discord.gg/tunnel-saas)
- **GitHub Issues**: [Reportar Bugs](https://github.com/your-org/tunnel-saas/issues)

## 🎯 Roadmap

### Próximas Funcionalidades
- [ ] Suporte a WebRTC
- [ ] Integração com Kubernetes
- [ ] Dashboard de métricas avançado
- [ ] API GraphQL
- [ ] Suporte a múltiplos idiomas
- [ ] Mobile app
- [ ] Integração com CI/CD

---

**Desenvolvido com ❤️ pela equipe Tunnel SaaS**
