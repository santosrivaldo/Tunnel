#!/bin/bash

echo "🔧 Corrigindo problemas e reiniciando Tunnel SaaS..."

# Parar todos os containers
echo "⏹️ Parando containers..."
docker-compose down

# Remover containers e volumes antigos
echo "🧹 Limpando containers antigos..."
docker-compose rm -f
docker volume rm tunnel_mongo_data 2>/dev/null || true
docker volume rm tunnel_redis_data 2>/dev/null || true

# Rebuild dos containers
echo "🔨 Fazendo rebuild dos containers..."
docker-compose build --no-cache

# Iniciar os serviços
echo "🚀 Iniciando serviços..."
docker-compose up -d

# Aguardar os serviços iniciarem
echo "⏳ Aguardando serviços iniciarem..."
sleep 15

# Verificar status
echo "📊 Status dos containers:"
docker-compose ps

# Verificar se os serviços estão funcionando
echo "🔍 Testando serviços..."

# Testar API
echo "Testing API..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ API está funcionando"
else
    echo "❌ API não está respondendo"
fi

# Testar Frontend
echo "Testing Frontend..."
if curl -f http://localhost:3002 > /dev/null 2>&1; then
    echo "✅ Frontend está funcionando"
else
    echo "❌ Frontend não está respondendo"
fi

# Testar Nginx
echo "Testing Nginx..."
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Nginx está funcionando"
else
    echo "❌ Nginx não está respondendo"
fi

echo ""
echo "✅ Correções aplicadas e serviços reiniciados!"
echo ""
echo "🌐 Acessos:"
echo "   Frontend: http://localhost:3002"
echo "   API: http://localhost:3001"
echo "   Nginx: http://localhost:8080"
echo ""
echo "🔍 Para ver logs:"
echo "   docker-compose logs -f"
echo ""
echo "📋 Para ver logs de um serviço específico:"
echo "   docker-compose logs -f app"
echo "   docker-compose logs -f client"
echo "   docker-compose logs -f nginx"
