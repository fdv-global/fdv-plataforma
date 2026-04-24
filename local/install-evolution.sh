#!/usr/bin/env bash
# FDV — Instala Evolution API v2.1.1 no EC2 Ubuntu 22.04
# Uso: bash install-evolution.sh <PUBLIC_IP>
# Ex:  bash install-evolution.sh 15.229.19.120
set -euo pipefail

PUBLIC_IP="${1:-}"
if [[ -z "$PUBLIC_IP" ]]; then
  echo "Uso: $0 <PUBLIC_IP>"
  echo "Ex:  $0 15.229.19.120"
  exit 1
fi

WORKDIR="/home/ubuntu/evolution"

echo "==> [1/5] Atualizando sistema"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> [2/5] Instalando Docker + Compose plugin"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker ubuntu
fi
sudo apt-get install -y docker-compose-plugin jq openssl

echo "==> [3/5] Gerando credenciais"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

API_KEY="$(openssl rand -hex 32)"
PG_PASSWORD="$(openssl rand -hex 16)"

cat > .env <<ENV
SERVER_URL=http://${PUBLIC_IP}:8080
AUTHENTICATION_API_KEY=${API_KEY}
POSTGRES_PASSWORD=${PG_PASSWORD}

DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:${PG_PASSWORD}@postgres:5432/evolution
DATABASE_CONNECTION_CLIENT_NAME=evolution
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true

CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/0
CACHE_REDIS_PREFIX_KEY=evolution
CACHE_REDIS_SAVE_INSTANCES=true
CACHE_LOCAL_ENABLED=false

WEBHOOK_GLOBAL_ENABLED=false
WEBHOOK_GLOBAL_URL=
WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false

QRCODE_LIMIT=30
QRCODE_COLOR=#000000

LOG_LEVEL=ERROR,WARN,INFO
LOG_COLOR=true
LOG_BAILEYS=error

CONFIG_SESSION_PHONE_CLIENT=Evolution API
CONFIG_SESSION_PHONE_NAME=Chrome
DEL_INSTANCE=false

CLEAN_STORE_CLEANING_INTERVAL=7200
CLEAN_STORE_MESSAGES=true
CLEAN_STORE_MESSAGE_UP=true
CLEAN_STORE_CONTACTS=true
CLEAN_STORE_CHATS=true

CORS_ORIGIN=*
CORS_METHODS=POST,GET,PUT,DELETE
CORS_CREDENTIALS=true

LANGUAGE=pt-BR
ENV

cat > docker-compose.yml <<COMPOSE
services:
  evolution-api:
    image: atendai/evolution-api:v2.1.1
    container_name: evolution-api
    restart: always
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    env_file:
      - .env
    volumes:
      - evolution_instances:/evolution/instances
    networks:
      - evo

  postgres:
    image: postgres:15
    container_name: evolution-postgres
    restart: always
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - evo

  redis:
    image: redis:7-alpine
    container_name: evolution-redis
    restart: always
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    networks:
      - evo

volumes:
  evolution_instances:
  postgres_data:
  redis_data:

networks:
  evo:
    driver: bridge
COMPOSE

echo "==> [4/5] Subindo containers"
sudo docker compose pull
sudo docker compose up -d

echo "==> [5/5] Aguardando Evolution API ficar saudável (até 60s)"
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:8080/" &>/dev/null; then
    echo "  OK após $((i * 2))s"
    break
  fi
  sleep 2
done

cat > /home/ubuntu/evolution-credentials.txt <<CREDS
EVOLUTION_API_URL=http://${PUBLIC_IP}:8080
EVOLUTION_API_KEY=${API_KEY}
POSTGRES_PASSWORD=${PG_PASSWORD}
CREDS
chmod 600 /home/ubuntu/evolution-credentials.txt

echo ""
echo "============================================================"
echo "  Evolution API PRONTA"
echo "  URL:     http://${PUBLIC_IP}:8080"
echo "  API KEY: ${API_KEY}"
echo ""
echo "  Credenciais salvas em ~/evolution-credentials.txt"
echo "  GUARDE A API KEY — vai no app.js e no webhook"
echo "============================================================"
echo ""
curl -s "http://localhost:8080/" | python3 -m json.tool 2>/dev/null || true
