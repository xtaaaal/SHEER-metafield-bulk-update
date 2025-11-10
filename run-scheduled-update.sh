#!/bin/bash

# Scheduled Metafield Update Script with Logging
# This script runs the metafield updater and logs all output

# Set PATH to include common node locations (for launchd compatibility)
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create logs directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/logs"

# Generate timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$SCRIPT_DIR/logs/metafield-update-$TIMESTAMP.log"

# Log start time
echo "========================================" | tee -a "$LOG_FILE"
echo "Metafield Update Started: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Run the update script and capture all output
node bulk-update-metafields-from-tags.js 2>&1 | tee -a "$LOG_FILE"

# Log completion time
echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Metafield Update Completed: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Keep only last 30 days of logs (optional)
find "$SCRIPT_DIR/logs" -name "metafield-update-*.log" -mtime +30 -delete

# Create a symlink to the latest log
ln -sf "$LOG_FILE" "$SCRIPT_DIR/logs/latest.log"

echo "Log saved to: $LOG_FILE"
