#!/bin/bash

echo "🔧 Corrigindo problemas do cliente React..."

# Parar apenas o container do cliente
echo "⏹️ Parando container do cliente..."
docker-compose stop client

# Remover container do cliente
echo "🗑️ Removendo container do cliente..."
docker-compose rm -f client

# Rebuild apenas do cliente
echo "🔨 Fazendo rebuild do cliente..."
docker-compose build --no-cache client

# Iniciar o cliente
echo "🚀 Iniciando cliente..."
docker-compose up -d client

# Aguardar o cliente iniciar
echo "⏳ Aguardando cliente iniciar..."
sleep 10

# Verificar status
echo "📊 Status do cliente:"
docker-compose ps client

# Verificar logs
echo "📋 Logs do cliente:"
docker-compose logs --tail=20 client

echo ""
echo "✅ Cliente corrigido e reiniciado!"
echo ""
echo "🌐 Acesse: http://localhost:3002"
echo ""
echo "🔍 Para ver logs em tempo real:"
echo "   docker-compose logs -f client"
