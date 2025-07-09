#!/bin/bash

echo "🌐 Setting up custom domain for ICPAC Boardroom System..."

# Check if domain already exists in hosts file
if grep -q "icpacboardroom.local" /etc/hosts; then
    echo "✅ Custom domain already configured in hosts file"
else
    echo "📝 Adding custom domain to hosts file..."
    echo "127.0.0.1 icpacboardroom.local" | sudo tee -a /etc/hosts
    echo "✅ Custom domain added successfully!"
fi

echo ""
echo "🚀 Setup complete! You can now access the application at:"
echo "   http://icpacboardroom.local:3000"
echo ""
echo "📋 To start the application:"
echo "   npm start"
echo ""
echo "🔍 To verify the setup:"
echo "   ping icpacboardroom.local"