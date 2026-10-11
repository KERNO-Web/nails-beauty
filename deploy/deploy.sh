#!/bin/bash
# Выкладка сайтов салонов на zapisvonline.ru/<slug>: собрать и отправить на сервер (Caddy отдаёт ~/nails).
# Сайты автосервисов не трогаются. Запуск с Мака: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
npm run sites
# Адрес не должен быть занят точкой автосервиса — иначе её страницу перекроет салон
for d in out/*/; do
  slug=$(basename "$d"); [ "$slug" = n ] && continue
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://zapisvonline.ru/api/t/$slug")
  if [ "$code" = 200 ]; then echo "Адрес /$slug занят автосервисом — переименуйте салон" >&2; exit 1; fi
done
rsync -az --delete out/ shina:~/nails/
echo "Готово"
