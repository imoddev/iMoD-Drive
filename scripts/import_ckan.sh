#!/bin/bash
# Wrapper script for CKAN import with automatic env loading

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Load environment variables from .env
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found!"
  echo ""
  echo "Please follow these steps:"
  echo ""
  echo "1. Copy the template:"
  echo "   cp .env.template .env"
  echo ""
  echo "2. Open Supabase dashboard:"
  echo "   https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/settings/api-keys/legacy"
  echo ""
  echo "3. Click 'Reveal' next to service_role key and copy it"
  echo ""
  echo "4. Edit .env file and paste the key:"
  echo "   SUPABASE_SERVICE_ROLE_KEY=<paste_your_key_here>"
  echo ""
  exit 1
fi

# Load .env
export $(grep -v '^#' .env | xargs)

# Check if required vars are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Missing required environment variables"
  echo ""
  echo "Please check your .env file contains:"
  echo "  SUPABASE_URL=https://rayaztyesqxnbsxpvuvl.supabase.co"
  echo "  SUPABASE_SERVICE_ROLE_KEY=<your_key>"
  exit 1
fi

# Check if dataset_id is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <dataset_id> [year1 year2 ...]"
  echo ""
  echo "Example:"
  echo "  $0 stat_1_1_01_first_regis_vehicles_car 2567"
  echo "  $0 stat_1_1_01_first_regis_vehicles_car 2566 2567"
  echo ""
  exit 1
fi

echo "=================================="
echo "CKAN Import Script"
echo "=================================="
echo "Project URL: $SUPABASE_URL"
echo "Dataset: $1"
echo "Years: ${@:2}"
echo "=================================="
echo ""

# Run the Ruby import script
ruby "$SCRIPT_DIR/import_ckan_dataset_years.rb" "$@"

exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo ""
  echo "=================================="
  echo "✅ Import completed successfully!"
  echo "=================================="
else
  echo ""
  echo "=================================="
  echo "❌ Import failed with exit code $exit_code"
  echo "=================================="
fi

exit $exit_code
