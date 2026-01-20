#!/bin/bash
# Interactive script to setup .env file

echo "========================================"
echo "Supabase Environment Setup"
echo "========================================"
echo ""

# Check if .env already exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists!"
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
  fi
fi

# Create .env from template
cat > .env << 'EOL'
# Supabase Configuration
SUPABASE_URL=https://rayaztyesqxnbsxpvuvl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_KEY_HERE
EOL

echo "✅ .env file created!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Go to Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/settings/api-keys/legacy"
echo ""
echo "2. Click 'Reveal' button next to service_role key"
echo ""
echo "3. Click 'Copy' button to copy the key"
echo ""
echo "4. Edit .env file and replace PASTE_YOUR_KEY_HERE with your actual key:"
echo "   nano .env"
echo "   (or use any text editor you prefer)"
echo ""
echo "5. Verify your .env file:"
echo "   cat .env"
echo ""
echo "6. Run the import script:"
echo "   ./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567"
echo ""
