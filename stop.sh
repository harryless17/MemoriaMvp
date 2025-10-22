#!/bin/bash

echo "🛑 Stopping Memoria Face Clustering System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to stop ML Worker
stop_ml_worker() {
    echo -e "${BLUE}🤖 Stopping ML Worker...${NC}"
    
    if docker ps -q -f name=ml-worker | grep -q .; then
        docker stop ml-worker
        echo -e "${GREEN}✅ ML Worker stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  ML Worker container is not running${NC}"
    fi
    
    # Optionally remove the container
    if docker ps -aq -f name=ml-worker | grep -q .; then
        echo -e "${BLUE}🗑️  Removing ML Worker container...${NC}"
        docker rm ml-worker
        echo -e "${GREEN}✅ ML Worker container removed${NC}"
    fi
}

# Function to stop Next.js
stop_nextjs() {
    echo -e "${BLUE}🌐 Stopping Next.js...${NC}"
    
    # Find and kill Next.js processes
    NEXTJS_PIDS=$(lsof -ti:3000)
    if [ ! -z "$NEXTJS_PIDS" ]; then
        echo -e "${BLUE}🔍 Found Next.js processes: $NEXTJS_PIDS${NC}"
        kill $NEXTJS_PIDS
        echo -e "${GREEN}✅ Next.js stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  No Next.js processes found on port 3000${NC}"
    fi
    
    # Also kill any pnpm processes
    PNPM_PIDS=$(pgrep -f "pnpm dev")
    if [ ! -z "$PNPM_PIDS" ]; then
        echo -e "${BLUE}🔍 Found pnpm dev processes: $PNPM_PIDS${NC}"
        kill $PNPM_PIDS
        echo -e "${GREEN}✅ pnpm dev processes stopped${NC}"
    fi
}

# Function to clean up any remaining processes
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    
    # Kill any remaining Node.js processes related to this project
    NODE_PIDS=$(pgrep -f "next-server")
    if [ ! -z "$NODE_PIDS" ]; then
        echo -e "${BLUE}🔍 Found Next.js server processes: $NODE_PIDS${NC}"
        kill $NODE_PIDS
        echo -e "${GREEN}✅ Next.js server processes stopped${NC}"
    fi
}

# Function to show status
show_status() {
    echo -e "${BLUE}📊 System Status:${NC}"
    
    # Check ML Worker
    if docker ps -q -f name=ml-worker | grep -q .; then
        echo -e "${YELLOW}🤖 ML Worker: Running${NC}"
    else
        echo -e "${GREEN}🤖 ML Worker: Stopped${NC}"
    fi
    
    # Check Next.js
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
        echo -e "${YELLOW}🌐 Next.js: Running on port 3000${NC}"
    else
        echo -e "${GREEN}🌐 Next.js: Stopped${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Stopping Memoria System${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    
    # Stop services
    stop_ml_worker
    stop_nextjs
    cleanup
    
    echo ""
    echo -e "${GREEN}🎉 System stopped successfully!${NC}"
    echo ""
    
    # Show final status
    show_status
    
    echo ""
    echo -e "${YELLOW}💡 To start the system again, run: ./start.sh${NC}"
}

# Run main function
main "$@"
