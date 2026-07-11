#!/usr/bin/env bash
set -euo pipefail

# Arranca un entorno de desarrollo local completo en un solo comando: stack de
# Supabase -> bootstrap admin (idempotente) -> `next dev` con las variables de
# entorno ya resueltas. Ver supabase/migrations/README.md, sección "Entorno
# local: de cero a `npm run dev`", para correr los pasos a mano si se prefiere.
#
# Sobreescribible por variable de entorno antes de invocar el script:
# SUPABASE_BOOTSTRAP_EMAIL, SUPABASE_BOOTSTRAP_PASSWORD,
# SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE, VEHICULOS_ACCESS_TOKEN.

: "${SUPABASE_BOOTSTRAP_EMAIL:=dev@ejemplo.local}"
: "${SUPABASE_BOOTSTRAP_PASSWORD:=password-desarrollo-local}"
: "${SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE:=Hogar de desarrollo}"
: "${VEHICULOS_ACCESS_TOKEN:=token-desarrollo-local}"
export SUPABASE_BOOTSTRAP_EMAIL SUPABASE_BOOTSTRAP_PASSWORD SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE VEHICULOS_ACCESS_TOKEN

if ! supabase status >/dev/null 2>&1; then
  echo "Levantando el stack local de Supabase..."
  supabase start
fi

estado_supabase="$(supabase status -o env)"
db_url="$(echo "$estado_supabase" | sed -n 's/^DB_URL="\(.*\)"$/\1/p')"
export SUPABASE_URL
SUPABASE_URL="$(echo "$estado_supabase" | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
export SUPABASE_ANON_KEY
SUPABASE_ANON_KEY="$(echo "$estado_supabase" | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"

if [[ -z "$db_url" || -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "No se pudo leer DB_URL/API_URL/ANON_KEY de 'supabase status -o env'; abortando." >&2
  exit 1
fi

echo "Sembrando (o reutilizando) el hogar/usuario de desarrollo..."
salida_bootstrap="$(SUPABASE_BOOTSTRAP_DATABASE_URL="$db_url" npm run bootstrap:admin 2>&1)"
echo "$salida_bootstrap"

household_id="$(echo "$salida_bootstrap" | sed -n 's/.*householdId: \([0-9a-f-]*\).*/\1/p')"
if [[ -z "$household_id" ]]; then
  echo "No se pudo extraer householdId de la salida del bootstrap; abortando." >&2
  exit 1
fi
export SUPABASE_HOUSEHOLD_ID_DESARROLLO="$household_id"

echo ""
echo "Listo. Levantando next dev (VEHICULOS_ACCESS_TOKEN=$VEHICULOS_ACCESS_TOKEN)."
echo "Cualquier cliente HTTP debe mandar el header x-vehiculos-access-token con ese valor."
echo ""

exec npm run dev
