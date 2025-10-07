#!/bin/bash

# Tunnel SaaS Agent Installation Script
# This script installs the tunnel agent on Linux/macOS systems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="wss://tunnel.suadominio.io/ws"
INSTALL_DIR="/opt/tunnel-agent"
SERVICE_NAME="tunnel-agent"
CONFIG_FILE="$INSTALL_DIR/config.json"

# Functions
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
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is not recommended for security reasons."
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Detect OS and architecture
detect_system() {
    print_status "Detecting system..."
    
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64)
            ARCH="amd64"
            ;;
        arm64|aarch64)
            ARCH="arm64"
            ;;
        armv7l)
            ARCH="arm"
            ;;
        *)
            print_error "Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac
    
    print_success "Detected: $OS $ARCH"
}

# Download and install agent
install_agent() {
    print_status "Installing tunnel agent..."
    
    # Create installation directory
    sudo mkdir -p $INSTALL_DIR
    
    # Download agent binary
    AGENT_URL="https://github.com/your-org/tunnel-agent/releases/latest/download/tunnel-agent-${OS}-${ARCH}"
    print_status "Downloading agent from $AGENT_URL..."
    
    if command -v curl >/dev/null 2>&1; then
        sudo curl -L -o $INSTALL_DIR/tunnel-agent $AGENT_URL
    elif command -v wget >/dev/null 2>&1; then
        sudo wget -O $INSTALL_DIR/tunnel-agent $AGENT_URL
    else
        print_error "Neither curl nor wget is available. Please install one of them."
        exit 1
    fi
    
    # Make executable
    sudo chmod +x $INSTALL_DIR/tunnel-agent
    
    print_success "Agent downloaded and installed to $INSTALL_DIR"
}

# Create configuration
create_config() {
    print_status "Creating configuration..."
    
    # Get user input
    read -p "Enter your agent token: " AGENT_TOKEN
    read -p "Enter your agent ID: " AGENT_ID
    read -p "Enter server URL (default: $SERVER_URL): " CUSTOM_SERVER_URL
    
    if [ -z "$CUSTOM_SERVER_URL" ]; then
        CUSTOM_SERVER_URL=$SERVER_URL
    fi
    
    # Create config file
    sudo tee $CONFIG_FILE > /dev/null <<EOF
{
  "server_url": "$CUSTOM_SERVER_URL",
  "token": "$AGENT_TOKEN",
  "agent_id": "$AGENT_ID",
  "auto_reconnect": true,
  "heartbeat_interval": 30000,
  "max_reconnect_attempts": 5,
  "reconnect_delay": 5000
}
EOF
    
    print_success "Configuration created at $CONFIG_FILE"
}

# Create systemd service
create_service() {
    print_status "Creating systemd service..."
    
    # Create service file
    sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=Tunnel SaaS Agent
After=network.target

[Service]
Type=simple
User=tunnel-agent
Group=tunnel-agent
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/tunnel-agent
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Create user and group
    if ! id "tunnel-agent" &>/dev/null; then
        sudo useradd -r -s /bin/false tunnel-agent
    fi
    
    # Set ownership
    sudo chown -R tunnel-agent:tunnel-agent $INSTALL_DIR
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    print_success "Systemd service created"
}

# Start service
start_service() {
    print_status "Starting tunnel agent service..."
    
    # Enable service
    sudo systemctl enable $SERVICE_NAME
    
    # Start service
    sudo systemctl start $SERVICE_NAME
    
    # Check status
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        print_success "Tunnel agent service is running"
    else
        print_error "Failed to start tunnel agent service"
        print_status "Check logs with: sudo journalctl -u $SERVICE_NAME -f"
        exit 1
    fi
}

# Show status
show_status() {
    print_status "Tunnel agent status:"
    sudo systemctl status $SERVICE_NAME --no-pager
    
    echo
    print_status "To view logs: sudo journalctl -u $SERVICE_NAME -f"
    print_status "To stop service: sudo systemctl stop $SERVICE_NAME"
    print_status "To restart service: sudo systemctl restart $SERVICE_NAME"
}

# Main installation process
main() {
    echo "=========================================="
    echo "    Tunnel SaaS Agent Installer"
    echo "=========================================="
    echo
    
    check_root
    detect_system
    install_agent
    create_config
    create_service
    start_service
    show_status
    
    echo
    print_success "Installation completed successfully!"
    print_status "Your tunnel agent is now running and ready to create tunnels."
}

# Run main function
main "$@"
