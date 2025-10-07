#!/bin/bash

echo "🔍 Testando conectividade WebSocket..."

# Verificar se os containers estão rodando
echo "📊 Status dos containers:"
docker-compose ps

echo ""
echo "🌐 Testando URLs:"

# Testar API diretamente
echo "1. Testando API direta (localhost:3001):"
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ API local funcionando"
else
    echo "   ❌ API local não está respondendo"
fi

# Testar API via domínio
echo "2. Testando API via domínio:"
if curl -f https://api.tunnel.tudoparasualavanderia.com.br/api/health > /dev/null 2>&1; then
    echo "   ✅ API via domínio funcionando"
else
    echo "   ❌ API via domínio não está respondendo"
fi

# Testar WebSocket endpoint
echo "3. Testando endpoint WebSocket:"
if curl -f https://api.tunnel.tudoparasualavanderia.com.br/socket.io/ > /dev/null 2>&1; then
    echo "   ✅ WebSocket endpoint acessível"
else
    echo "   ❌ WebSocket endpoint não acessível"
fi

echo ""
echo "🔧 Verificações do Nginx Proxy Manager:"
echo "   Certifique-se de que tem estes proxy hosts configurados:"
echo "   1. api.tunnel.tudoparasualavanderia.com.br → tunnel_app_1:3000"
echo "   2. Websockets Support: ✅ Habilitado"
echo "   3. SSL: ✅ Configurado"
echo ""
echo "📋 Para ver logs do app:"
echo "   docker-compose logs -f app"
echo ""
echo "🔍 Para testar WebSocket manualmente:"
echo "   wscat -c wss://api.tunnel.tudoparasualavanderia.com.br/socket.io/"
