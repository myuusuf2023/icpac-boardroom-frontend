#!/bin/bash

# ICPAC Booking System - Docker Build Script
echo "🏢 Building ICPAC Booking System Docker Image..."

# Build the Docker image
docker build -t icpac/booking-system:latest .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "🚀 To run the system:"
    echo "   docker run -p 3000:80 icpac/booking-system:latest"
    echo ""
    echo "🔧 Or use docker-compose:"
    echo "   docker-compose up -d"
    echo ""
    echo "🌐 Then access at: http://localhost:3000"
else
    echo "❌ Docker build failed!"
    exit 1
fi