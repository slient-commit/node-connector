#!/bin/bash
# Node Connector — Linux Auto-Start Uninstaller
# Removes the systemd service created by service-install.sh

SERVICE_NAME="node-connector"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Check for root
if [ "$(id -u)" -ne 0 ]; then
    echo "[ERROR] This script requires root privileges."
    echo "        Run with: sudo ./service-uninstall.sh"
    exit 1
fi

echo ""
echo "  Node Connector — Auto-Start Uninstaller"
echo "  ========================================="
echo ""

# Check if service exists
if [ ! -f "$SERVICE_FILE" ]; then
    echo "  [INFO] Service '${SERVICE_NAME}' not found. Nothing to remove."
    echo ""
    exit 0
fi

# Stop and disable service
echo "  [INFO] Stopping service..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

echo "  [INFO] Disabling service..."
systemctl disable "$SERVICE_NAME" 2>/dev/null || true

# Remove service file
echo "  [INFO] Removing service file..."
rm -f "$SERVICE_FILE"

# Reload systemd
systemctl daemon-reload

echo ""
echo "  [OK] Service '${SERVICE_NAME}' removed successfully."
echo "  Node Connector will no longer start on boot."
echo ""
