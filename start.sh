#!/bin/bash

echo "🚀 Starting Memoria Face Clustering System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to check if container exists and is running
check_container() {
    if docker ps -q -f name=ml-worker | grep -q .; then
        echo -e "${YELLOW}⚠️  ML Worker container is already running${NC}"
        return 0
    elif docker ps -aq -f name=ml-worker | grep -q .; then
        echo -e "${YELLOW}⚠️  ML Worker container exists but is stopped. Starting it...${NC}"
        docker start ml-worker
        return 0
    fi
    return 1
}

# Function to start ML Worker
start_ml_worker() {
    echo -e "${BLUE}🤖 Starting ML Worker...${NC}"
    
    if check_container; then
        echo -e "${GREEN}✅ ML Worker is already running${NC}"
    else
        cd worker
        if [ ! -f .env ]; then
            echo -e "${RED}❌ .env file not found in worker directory${NC}"
            exit 1
        fi
        
        docker run -d \
            -p 8080:8080 \
            --env-file .env \
            --name ml-worker \
            --restart unless-stopped \
            memoria-ml-worker
        
        echo -e "${GREEN}✅ ML Worker started${NC}"
        cd ..
    fi
    
    # Wait a moment for the worker to start
    sleep 3
    
    # Test the worker
    echo -e "${BLUE}🔍 Testing ML Worker...${NC}"
    if curl -s http://localhost:8080/health >/dev/null; then
        echo -e "${GREEN}✅ ML Worker is healthy${NC}"
    else
        echo -e "${RED}❌ ML Worker health check failed${NC}"
        exit 1
    fi
}

# Function to start Next.js (Web only)
start_nextjs() {
    echo -e "${BLUE}🌐 Starting Next.js web frontend...${NC}"
    
    # Check if Next.js is already running
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
        echo -e "${YELLOW}⚠️  Next.js is already running on port 3000${NC}"
        echo -e "${BLUE}🌐 Web frontend available at: http://localhost:3000${NC}"
        return 0
    fi
    
    # Check if apps/web directory exists
    if [ ! -d "apps/web" ]; then
        echo -e "${RED}❌ apps/web directory not found${NC}"
        exit 1
    fi
    
    # Start Next.js in background from apps/web directory
    echo -e "${BLUE}🚀 Launching Next.js from apps/web...${NC}"
    cd apps/web
    pnpm dev &
    cd ../..
    
    # Wait for Next.js to start
    echo -e "${BLUE}⏳ Waiting for Next.js to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Next.js is running${NC}"
            echo -e "${BLUE}🌐 Web frontend available at: http://localhost:3000${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ Next.js failed to start within 30 seconds${NC}"
    exit 1
}

# Main execution
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Memoria Face Clustering System${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    
    # Check Docker
    check_docker
    
    # Start ML Worker
    start_ml_worker
    
    # Start Next.js
    start_nextjs
    
    echo ""
    echo -e "${GREEN}🎉 System started successfully!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Web Frontend: http://localhost:3000${NC}"
    echo -e "${BLUE}🤖 ML Worker: http://localhost:8080/health${NC}"
    echo ""
    echo -e "${YELLOW}📝 Note: Only web frontend is started (mobile not included)${NC}"
    echo -e "${YELLOW}💡 To stop the system, run: ./stop.sh${NC}"
}

# Run main function
main "$@"
