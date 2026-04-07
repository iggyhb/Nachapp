#!/bin/bash
# =================================================
# Nachapp — Setup completo para producción
# Ejecutar desde la carpeta raíz del proyecto
# =================================================

set -e  # Parar si algo falla

echo ""
echo "🚀 Nachapp Setup"
echo "================"

# ── 1. Variables ──────────────────────────────────
DB_URL="postgresql://postgres:Barrabaja_8@db.sdnvtqlgnecyxrqxmnob.supabase.co:5432/postgres"
SUPABASE_URL="https://sdnvtqlgnecyxrqxmnob.supabase.co"
SERVICE_ROLE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkbnZ0cWxnbmVjeXhycXhtbm9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU2NDY2MSwiZXhwIjoyMDkxMTQwNjYxfQ.YHn-GxUx-dFmOjSvq8-bxGvpP1DPanIMdtbhp58PhWQ"

# ── 2. Instalar dependencias ──────────────────────
echo ""
echo "📦 Instalando dependencias..."
npm install

# ── 3. Migrar base de datos ───────────────────────
echo ""
echo "🗄️  Creando tablas en Supabase..."
DATABASE_URL="$DB_URL" npx drizzle-kit push:pg --accept-data-loss
echo "✅ Tablas creadas"

# ── 4. Crear buckets de Storage ───────────────────
echo ""
echo "🪣 Creando buckets de Storage..."

create_bucket() {
  local NAME=$1
  local PUBLIC=$2
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$SUPABASE_URL/storage/v1/bucket" \
    -H "apikey: $SERVICE_ROLE" \
    -H "Authorization: Bearer $SERVICE_ROLE" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"$NAME\", \"name\": \"$NAME\", \"public\": $PUBLIC}"
}

STATUS=$(create_bucket "ebooks" "false")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "409" ]; then
  echo "✅ Bucket 'ebooks' listo"
else
  echo "⚠️  Bucket 'ebooks' — respuesta HTTP $STATUS"
fi

STATUS=$(create_bucket "covers" "true")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "409" ]; then
  echo "✅ Bucket 'covers' listo"
else
  echo "⚠️  Bucket 'covers' — respuesta HTTP $STATUS"
fi

# ── 5. Commit y push ──────────────────────────────
echo ""
echo "📤 Subiendo cambios a GitHub..."
git add -A
git commit -m "chore: switch to postgres-js driver, add env config, setup storage"
git push
echo "✅ Push completado"

# ── 6. Resumen ────────────────────────────────────
echo ""
echo "================================================"
echo "✅ Setup completado."
echo ""
echo "Próximos pasos:"
echo "  1. Despliega en Vercel: vercel.com/new → importa 'Nachapp'"
echo "  2. Añade las variables de .env.vercel en Vercel"
echo "  3. Abre la app en el móvil y registra tu usuario"
echo "  4. Copia tu UUID de usuario a AGENT_USER_ID"
echo "================================================"
echo ""
