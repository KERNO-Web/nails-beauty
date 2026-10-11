#!/usr/bin/env bash
# Первичная настройка и обновление сервера (Ubuntu 22.04/24.04, в том числе с ISPmanager).
# Запускается из GitHub Actions по SSH от root; можно и руками: DOMAIN=… bash setup.sh
# Повторный запуск безопасен: ставит недостающее, ключи и данные не трогает.
set -euo pipefail

APP=${APP:-okoshko}
DOMAIN=${DOMAIN:?укажите DOMAIN}
HOME_DIR=/opt/$APP
WEB=/var/www/$APP
PORT=${PORT:-8787}

export DEBIAN_FRONTEND=noninteractive
need=()
command -v node >/dev/null || need+=(nodejs npm)
command -v nginx >/dev/null || need+=(nginx)
command -v certbot >/dev/null || need+=(certbot)
command -v rsync >/dev/null || need+=(rsync)
if ((${#need[@]})); then
  apt-get update -q
  apt-get install -y -q "${need[@]}"
fi

id "$APP" >/dev/null 2>&1 || useradd --system --home "$HOME_DIR" --shell /usr/sbin/nologin "$APP"
mkdir -p "$HOME_DIR/push" "$HOME_DIR/data" "$WEB"
chown -R "$APP:$APP" "$HOME_DIR/data"

# Сервер уведомлений (файлы приходят из репозитория в /tmp/$APP-push)
if [ -d "/tmp/$APP-push" ]; then
  rsync -a --delete --exclude node_modules --exclude data --exclude .env "/tmp/$APP-push/" "$HOME_DIR/push/"
fi
cd "$HOME_DIR/push"
npm ci --omit=dev --no-audit --no-fund --silent

# Ключи VAPID — один раз; публичный ключ сборка сайта забирает из $HOME_DIR/vapid-public.txt
ENV_FILE=$HOME_DIR/push.env
if [ ! -f "$ENV_FILE" ]; then
  KEYS=$(node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))")
  PUB=$(node -e "console.log(JSON.parse(process.argv[1]).publicKey)" "$KEYS")
  PRIV=$(node -e "console.log(JSON.parse(process.argv[1]).privateKey)" "$KEYS")
  umask 077
  cat > "$ENV_FILE" <<ENV
VAPID_PUBLIC_KEY=$PUB
VAPID_PRIVATE_KEY=$PRIV
VAPID_SUBJECT=https://$DOMAIN
PORT=$PORT
ALLOWED_ORIGINS=https://$DOMAIN
DATA_FILE=$HOME_DIR/data/db.json
ENV
  chown root:"$APP" "$ENV_FILE"
  chmod 640 "$ENV_FILE"
  umask 022
fi
grep '^VAPID_PUBLIC_KEY=' "$ENV_FILE" | cut -d= -f2 > "$HOME_DIR/vapid-public.txt"

cat > /etc/systemd/system/$APP-push.service <<UNIT
[Unit]
Description=$APP — уведомления и напоминания о записях
After=network-online.target

[Service]
User=$APP
EnvironmentFile=$ENV_FILE
WorkingDirectory=$HOME_DIR/push
ExecStart=$(command -v node) index.mjs
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$HOME_DIR/data

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable "$APP-push" >/dev/null
systemctl restart "$APP-push"

# nginx: сайты студий — /<студия>/, сервер уведомлений — /api/
NGINX_CONF=/etc/nginx/conf.d/$APP.conf
CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
write_nginx() {
  {
    echo "server {"
    echo "  listen 80;"
    echo "  server_name $DOMAIN;"
    echo "  location /.well-known/acme-challenge/ { root $WEB; }"
    if [ -f "$CERT" ]; then echo "  location / { return 301 https://\$host\$request_uri; }"; echo "}"; echo "server {"
      echo "  listen 443 ssl;"
      echo "  http2 on;"
      echo "  server_name $DOMAIN;"
      echo "  ssl_certificate $CERT;"
      echo "  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
    fi
    echo "  root $WEB;"
    echo "  location /api/ { proxy_pass http://127.0.0.1:$PORT; proxy_set_header X-Forwarded-For \$remote_addr; client_max_body_size 64k; }"
    echo "  location ~* /assets/ { expires 1y; add_header Cache-Control \"public, immutable\"; }"
    echo "  location ~* (sw\\.js|\\.webmanifest|index\\.html)\$ { add_header Cache-Control \"no-cache\"; }"
    echo "  location / { try_files \$uri \$uri/ =404; }"
    echo "}"
  } > "$NGINX_CONF"
  nginx -t && systemctl reload nginx
}
write_nginx
if [ ! -f "$CERT" ]; then
  certbot certonly --webroot -w "$WEB" -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
  write_nginx
fi

systemctl is-active "$APP-push"
echo "ok: https://$DOMAIN"
