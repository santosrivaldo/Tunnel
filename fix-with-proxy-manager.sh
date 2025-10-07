#!/bin/bash

echo "🔧 Configurando Tunnel SaaS para funcionar com Nginx Proxy Manager..."

# Parar todos os containers do tunnel
echo "⏹️ Parando containers do Tunnel SaaS..."
docker-compose down

# Verificar se há conflitos de porta
echo "🔍 Verificando conflitos de porta..."
echo "Portas em uso:"
netstat -tulpn | grep -E ':(3001|3002|27018|6380|8080)' || echo "Nenhum conflito encontrado"

# Rebuild completo
echo "🔨 Fazendo rebuild completo..."
docker-compose build --no-cache

# Iniciar apenas os serviços essenciais (sem nginx)
echo "🚀 Iniciando serviços essenciais..."
docker-compose up -d app client mongo redis

# Aguardar serviços iniciarem
echo "⏳ Aguardando serviços iniciarem..."
sleep 15

# Verificar status
echo "📊 Status dos containers:"
docker-compose ps

# Testar conectividade
echo "🔍 Testando conectividade..."

# Testar API
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ API funcionando na porta 3001"
else
    echo "❌ API não está respondendo na porta 3001"
fi

# Testar Frontend
if curl -f http://localhost:3002 > /dev/null 2>&1; then
    echo "✅ Frontend funcionando na porta 3002"
else
    echo "❌ Frontend não está respondendo na porta 3002"
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "🌐 Acessos diretos:"
echo "   API: http://localhost:3001"
echo "   Frontend: http://localhost:3002"
echo "   MongoDB: localhost:27018"
echo "   Redis: localhost:6380"
echo ""
echo "📋 Para configurar no Nginx Proxy Manager:"
echo "   1. Acesse seu Nginx Proxy Manager"
echo "   2. Crie um novo Proxy Host"
echo "   3. Configure:"
echo "      - Domain: tunnel.suadominio.io"
echo "      - Forward Hostname/IP: tunnel_app_1"
echo "      - Forward Port: 3000"
echo "      - Enable WebSocket Support: ✅"
echo ""
echo "🔍 Para ver logs:"
echo "   docker-compose logs -f"
