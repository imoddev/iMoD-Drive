#!/bin/bash
# Setup environment variables from .env file

if [ ! -f .env ]; then
  echo "❌ Error: .env file not found!"
  echo ""
  echo "Please create .env file from template:"
  echo "  cp .env.template .env"
  echo ""
  echo "Then edit .env and add your Supabase service role key."
  echo ""
  echo "You can find the key at:"
  echo "  https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/settings/api-keys/legacy"
  exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo "✅ Environment variables loaded"
echo "   SUPABASE_URL: $SUPABASE_URL"
echo "   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""
