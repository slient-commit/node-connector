#!/bin/bash
# Node Connector — Linux Auto-Start Installer
# Creates a systemd service to run on system boot

set -e

SERVICE_NAME="node-connector"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check for root
if [ "$(id -u)" -ne 0 ]; then
    echo "[ERROR] This script requires root privileges."
    echo "        Run with: sudo ./service-install.sh"
    exit 1
fi

# Find node path
NODE_PATH=$(which node 2>/dev/null)
if [ -z "$NODE_PATH" ]; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    exit 1
fi

echo ""
echo "  Node Connector — Auto-Start Installer"
echo "  ======================================="
echo ""
echo "  Service Name:  ${SERVICE_NAME}"
echo "  Project Dir:   ${PROJECT_DIR}"
echo "  Node Path:     ${NODE_PATH}"
echo ""

# Stop existing service if running
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "[INFO] Stopping existing service..."
    systemctl stop "$SERVICE_NAME"
fi

# Create systemd service file
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Node Connector — Workflow Automation
After=network.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_DIR}
ExecStart=${NODE_PATH} ${PROJECT_DIR}/start.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[INFO] Service file created at ${SERVICE_FILE}"

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

echo ""
echo "  [OK] Service '${SERVICE_NAME}' installed and started."
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status ${SERVICE_NAME}    # Check status"
echo "    sudo systemctl stop ${SERVICE_NAME}      # Stop service"
echo "    sudo systemctl restart ${SERVICE_NAME}   # Restart service"
echo "    sudo journalctl -u ${SERVICE_NAME} -f    # View logs"
echo ""
echo "  To uninstall:"
echo "    sudo ./service-uninstall.sh"
echo ""
