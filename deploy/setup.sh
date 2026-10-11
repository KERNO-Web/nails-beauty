#!/usr/bin/env bash
# Настройка и обновление сервера zapisvonline.ru (Ubuntu 24.04, веб-сервер Caddy — на нём уже живёт «Север Авто»).
# Каждая студия — свой поддомен: lumi.zapisvonline.ru → /var/www/zapisvonline/lumi. Сервер уведомлений общий, /api/ на каждом поддомене.
# Существующие сайты не трогает: добавляет в Caddyfile одну строку import и свои файлы в /etc/caddy/sites/.
# Запуск: из GitHub Actions по SSH от root или руками: DOMAIN=lumi.zapisvonline.ru bash setup.sh
# Повторный запуск безопасен: ставит недостающее, ключи и данные не трогает.
set -euo pipefail

APP=${APP:-zapisvonline}
STUDIO=${STUDIO:-lumi}
DOMAIN=${DOMAIN:?укажите DOMAIN}
HOME_DIR=/opt/$APP
WEB=/srv/$APP-studios
PORT=${PORT:-8787}

export DEBIAN_FRONTEND=noninteractive
need=()
command -v node >/dev/null || need+=(nodejs npm)
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
ALLOWED_ORIGINS=https://*.${DOMAIN#*.}
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

# Caddy: только системный (/etc/caddy/Caddyfile). Если он в Docker — ничего не меняем, печатаем, что нашли
CADDYFILE=/etc/caddy/Caddyfile
if ! systemctl is-active --quiet caddy || [ ! -f "$CADDYFILE" ]; then
  echo "Caddy не найден как системная служба — сайт не подключён. Что слушает 80/443:"
  ss -ltnp '( sport = :80 or sport = :443 )' || true
  command -v docker >/dev/null && docker ps --format '{{.Names}}  {{.Image}}  {{.Ports}}' || true
  exit 3
fi
mkdir -p /etc/caddy/sites "$WEB/$STUDIO"
cat > "/etc/caddy/sites/$APP-$STUDIO.caddy" <<SITE
$DOMAIN {
	encode zstd gzip
	handle /api/* {
		reverse_proxy 127.0.0.1:$PORT
	}
	handle {
		root * $WEB/$STUDIO
		@nocache path /sw.js /*.webmanifest / /index.html
		header @nocache Cache-Control "no-cache"
		header /assets/* Cache-Control "public, max-age=31536000, immutable"
		file_server
	}
}
SITE
cp "$CADDYFILE" "$CADDYFILE.bak-$APP"
grep -q '^import /etc/caddy/sites/\*.caddy' "$CADDYFILE" || printf '\nimport /etc/caddy/sites/*.caddy\n' >> "$CADDYFILE"
if caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null; then
  systemctl reload caddy
else
  echo "Конфиг Caddy не прошёл проверку — возвращаю как было"
  cp "$CADDYFILE.bak-$APP" "$CADDYFILE"
  rm -f "/etc/caddy/sites/$APP-$STUDIO.caddy"
  exit 4
fi

systemctl is-active "$APP-push"
echo "ok: https://$DOMAIN"
