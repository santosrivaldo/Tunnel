#!/bin/bash

echo "🔄 Reiniciando Tunnel SaaS com correções..."

# Parar todos os containers
echo "⏹️ Parando containers..."
docker-compose down

# Remover volumes para limpar dados antigos (opcional)
echo "🧹 Limpando volumes antigos..."
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
sleep 10

# Verificar status
echo "📊 Status dos containers:"
docker-compose ps

# Verificar logs
echo "📋 Logs recentes:"
docker-compose logs --tail=20

echo "✅ Reinicialização concluída!"
echo ""
echo "🌐 Acessos:"
echo "   Frontend: http://localhost:3002"
echo "   API: http://localhost:3001"
echo "   Nginx: http://localhost:8080"
echo ""
echo "🔍 Para ver logs em tempo real:"
echo "   docker-compose logs -f"
