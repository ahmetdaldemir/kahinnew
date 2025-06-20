#!/bin/bash

# KahinNew Deployment Script
# This script automates the deployment of the advanced ML trading system

set -e  # Exit on any error

echo "🚀 Starting KahinNew Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Check npm version
print_status "Checking npm version..."
NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION"

# Create logs directory if it doesn't exist
print_status "Creating logs directory..."
mkdir -p logs
print_success "Logs directory created"

# Install dependencies
print_status "Installing dependencies..."
npm install
print_success "Dependencies installed successfully"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Please create one with your database credentials."
    print_status "Creating sample .env file..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=kahinnew
DB_PORT=3306

# Environment
NODE_ENV=production

# API Configuration
PORT=3001
API_KEY=your_api_key

# ML Configuration
ML_CONFIDENCE_THRESHOLD=50
ML_UPDATE_INTERVAL=30

# Logging
LOG_LEVEL=info
EOF
    print_success "Sample .env file created. Please update with your actual credentials."
    exit 1
fi

# Update database schema
print_status "Updating database schema..."
npm run update-schema
print_success "Database schema updated successfully"

# Test advanced indicators
print_status "Testing advanced indicators..."
npm run test-indicators
print_success "Advanced indicators tested successfully"

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed successfully"
fi

# Setup PM2 log rotation
print_status "Setting up PM2 log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
print_success "PM2 log rotation configured"

# Stop existing PM2 processes
print_status "Stopping existing PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
print_success "Existing processes stopped"

# Start services with PM2
print_status "Starting services with PM2..."
pm2 start ecosystem.config.js --env production
print_success "Services started successfully"

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save
print_success "PM2 configuration saved"

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup
print_success "PM2 startup script configured"

# Show status
print_status "Current PM2 status:"
pm2 status

# Show logs
print_status "Recent logs:"
pm2 logs --lines 10

print_success "🎉 Deployment completed successfully!"
print_status "Services are now running:"
print_status "  - ML Prediction Service: scripts/cron-ml-prediction.js"
print_status "  - API Service: index.js"
print_status ""
print_status "Useful commands:"
print_status "  - View logs: pm2 logs"
print_status "  - Monitor: pm2 monit"
print_status "  - Restart: pm2 restart all"
print_status "  - Stop: pm2 stop all"
print_status "  - Status: pm2 status"
print_status ""
print_status "The system will automatically:"
print_status "  - Run ML predictions every 30 minutes"
print_status "  - Update database schema daily at 2 AM UTC"
print_status "  - Test indicators weekly on Sunday at 3 AM UTC"
print_status "  - Restart on crashes or memory issues"
print_status "  - Rotate logs automatically" 