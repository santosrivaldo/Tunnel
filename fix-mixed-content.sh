#!/bin/bash

echo "🔧 Corrigindo problema de mixed-content..."

# Parar container do cliente
echo "⏹️ Parando container do cliente..."
docker-compose stop client

# Remover container do cliente
echo "🗑️ Removendo container do cliente..."
docker-compose rm -f client

# Rebuild do cliente com as correções
echo "🔨 Fazendo rebuild do cliente..."
docker-compose build --no-cache client

# Iniciar o cliente
echo "🚀 Iniciando cliente..."
docker-compose up -d client

# Aguardar o cliente iniciar
echo "⏳ Aguardando cliente iniciar..."
sleep 15

# Verificar status
echo "📊 Status do cliente:"
docker-compose ps client

# Verificar logs
echo "📋 Logs do cliente:"
docker-compose logs --tail=20 client

echo ""
echo "✅ Correção de mixed-content aplicada!"
echo ""
echo "🌐 Acesse: https://tunnel.suadominio.io"
echo ""
echo "🔍 Para ver logs em tempo real:"
echo "   docker-compose logs -f client"
echo ""
echo "📋 Verificar no browser:"
echo "   1. Abra o DevTools (F12)"
echo "   2. Vá para a aba Console"
echo "   3. Verifique se não há mais erros de mixed-content"
echo "   4. Deve aparecer: 'Connecting to WebSocket: https://api.tunnel.suadominio.io'"
