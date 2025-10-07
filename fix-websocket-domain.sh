#!/bin/bash

echo "🔧 Corrigindo problema de domínio WebSocket..."

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
echo "✅ Correção de domínio WebSocket aplicada!"
echo ""
echo "🌐 Acesse: https://tunnel.tudoparasualavanderia.com.br"
echo ""
echo "🔍 Para verificar no browser:"
echo "   1. Abra o DevTools (F12)"
echo "   2. Vá para a aba Console"
echo "   3. Deve aparecer: 'Connecting to WebSocket: https://api.tunnel.tudoparasualavanderia.com.br'"
echo "   4. Não deve haver erros de conexão"
echo ""
echo "📋 Para testar conectividade:"
echo "   ./test-websocket-connection.sh"
