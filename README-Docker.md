# ICPAC Booking System - Docker Setup

## 🚀 Quick Start for Your Colleagues

### Option 1: Using Docker Compose (Recommended)
```bash
# Clone the repository
git clone https://github.com/myuusuf2023/icpac-boardroom-frontend.git
cd icpac-boardroom-frontend

# Start the system
docker-compose up -d

# Access at: http://localhost:3000
```

### Option 2: Using Docker Build Script
```bash
# Build the image
./docker-build.sh

# Run the container
docker run -p 3000:80 icpac/booking-system:latest
```

### Option 3: Manual Docker Commands
```bash
# Build the image
docker build -t icpac/booking-system .

# Run the container
docker run -p 3000:80 icpac/booking-system
```

## 👥 Team Access Methods

### Method 1: Share Docker Image
```bash
# On your machine - build and save image
docker build -t icpac/booking-system .
docker save icpac/booking-system > icpac-booking.tar

# Share the .tar file with colleagues
# Colleagues load and run:
docker load < icpac-booking.tar
docker run -p 3000:80 icpac/booking-system
```

### Method 2: Docker Hub Registry
```bash
# Push to Docker Hub (you do this once)
docker tag icpac/booking-system yourusername/icpac-booking:latest
docker push yourusername/icpac-booking:latest

# Colleagues pull and run:
docker run -p 3000:80 yourusername/icpac-booking:latest
```

### Method 3: Private Registry
```bash
# Set up private registry for ICPAC
docker run -d -p 5000:5000 --name registry registry:2

# Tag and push
docker tag icpac/booking-system localhost:5000/icpac-booking
docker push localhost:5000/icpac-booking

# Team pulls from private registry
docker pull localhost:5000/icpac-booking
docker run -p 3000:80 localhost:5000/icpac-booking
```

## 🔧 Advanced Configurations

### Environment Variables
```bash
# Development mode
docker run -e NODE_ENV=development -p 3000:80 icpac/booking-system

# Custom port
docker run -p 8080:80 icpac/booking-system

# With persistent data
docker run -v $(pwd)/data:/usr/share/nginx/html/data -p 3000:80 icpac/booking-system
```

### Docker Compose with Database (Future)
```yaml
# Uncomment database section in docker-compose.yml
# Then run:
docker-compose up -d
```

## 🌐 Deployment Options

### 1. Local Network Deployment
```bash
# Run on server accessible to team
docker run -p 80:80 icpac/booking-system

# Team accesses via: http://server-ip/
```

### 2. Cloud Deployment
```bash
# AWS ECS, Google Cloud Run, Azure Container Instances
# DigitalOcean App Platform, etc.
```

### 3. Kubernetes Deployment
```yaml
# kubernetes-deployment.yaml (can be created if needed)
```

## 🔍 Troubleshooting

### Check if container is running
```bash
docker ps
```

### View logs
```bash
docker logs icpac-booking-frontend
```

### Access container shell
```bash
docker exec -it icpac-booking-frontend sh
```

### Stop and remove
```bash
docker-compose down
# or
docker stop icpac-booking-frontend
docker rm icpac-booking-frontend
```

## 📊 System Requirements

- **Minimum**: Docker installed
- **Recommended**: Docker + Docker Compose
- **System**: Any OS with Docker support
- **Resources**: 512MB RAM, 1GB storage

## 🔐 Default Access

- **Super Admin**: admin@icpac.net / admin123
- **Procurement**: procurement@icpac.net / procurement123
- **Users**: Can sign up directly

## 🎯 Benefits for ICPAC Team

✅ **One Command Setup**: `docker-compose up -d`  
✅ **Consistent Environment**: Same on all machines  
✅ **No Dependencies**: Just Docker needed  
✅ **Easy Updates**: `docker-compose pull && docker-compose up -d`  
✅ **Isolated**: Won't conflict with other software  
✅ **Scalable**: Easy to add more features later