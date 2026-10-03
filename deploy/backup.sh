#!/bin/sh
# Daily compressed pg_dump of the lotery database.
# Restore: pg_restore --clean --if-exists -d lotery /backups/lotery-YYYY-MM-DD_HHMM.dump
set -eu

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
mkdir -p /backups

while true; do
  stamp="$(date +%Y-%m-%d_%H%M)"
  target="/backups/lotery-${stamp}.dump"
  if pg_dump --format=custom --compress=6 --file="${target}.tmp"; then
    mv "${target}.tmp" "${target}"
    echo "[backup] saved ${target}"
  else
    rm -f "${target}.tmp"
    echo "[backup] pg_dump failed at ${stamp}" >&2
  fi
  find /backups -name 'lotery-*.dump' -mtime +"${KEEP_DAYS}" -delete
  sleep 86400
done
