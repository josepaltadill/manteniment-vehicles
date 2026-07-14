#!/usr/bin/env bash
set -euo pipefail

# Arranca Supabase local, siembra una cuenta de login local y expone Next solo en
# loopback. La cuenta sembrada debe iniciar sesión manualmente; no existe una
# identidad de desarrollo inyectada en el runtime.

: "${SUPABASE_BOOTSTRAP_EMAIL:=dev@ejemplo.local}"
: "${SUPABASE_BOOTSTRAP_PASSWORD:=password-desarrollo-local}"
: "${SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE:=Hogar de desarrollo}"
export SUPABASE_BOOTSTRAP_EMAIL SUPABASE_BOOTSTRAP_PASSWORD SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE

if ! supabase status >/dev/null 2>&1; then
  echo "Levantando el stack local de Supabase..."
  supabase start
fi

estado_supabase="$(supabase status -o env)"
export SUPABASE_URL
SUPABASE_URL="$(echo "$estado_supabase" | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
export SUPABASE_ANON_KEY
SUPABASE_ANON_KEY="$(echo "$estado_supabase" | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "No se pudo leer API_URL/ANON_KEY de 'supabase status -o env'; abortando." >&2
  exit 1
fi

printf '%s\n' "Sembrando o reutilizando la cuenta de login local..."
SUPABASE_BOOTSTRAP_DATABASE_URL="$(echo "$estado_supabase" | sed -n 's/^DB_URL="\(.*\)"$/\1/p')" \
  npm run bootstrap:admin -- --seed-local

printf '\nURL de login: http://127.0.0.1:3000/login\nEmail local: %s\n' "$SUPABASE_BOOTSTRAP_EMAIL"
printf '%s\n\n' 'Usá la contraseña configurada localmente; el script no la muestra.'
exec npm run dev -- --hostname 127.0.0.1 --port 3000
