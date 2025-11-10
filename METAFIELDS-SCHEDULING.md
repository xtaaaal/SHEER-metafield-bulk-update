# Scheduling Automatic Metafield Updates

This guide shows you how to automatically run the metafield update script every day at 6:00 PM.

## 🚀 Deployment Options

Choose your deployment method:

### Option A: Cloud Deployment (Recommended) ⭐
Deploy to [Render.com](https://render.com/) for enterprise-grade reliability:
- ✅ Always running (no sleep issues)
- ✅ Zero maintenance required
- ✅ Free tier available
- ✅ Built-in logging and monitoring

📖 **See [RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md) for complete cloud setup guide**

### Option B: Local Mac Deployment
Run on your MacBook using launchd (instructions below):
- ⚠️ Requires Mac to be awake at scheduled time
- ⚠️ Mac must be powered on
- ⚠️ Manual maintenance needed

---

## 🎯 Current Status (Local Setup)

✅ **Job is active and scheduled**  
✅ **Will run daily at 6:00 PM**  
✅ **Logs saved to `logs/` directory**

To verify: Run `launchctl list | grep metafield-updater` (should show output)

---

## ⚠️ Important: Sleep Mode (Local Setup Only)

**The job will NOT run if your MacBook is sleeping!**

If your Mac is asleep at 6:00 PM, the scheduled job will be skipped for that day.

**Solutions:**
1. **Deploy to cloud:** Use Render.com (recommended) - see [RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md)
2. **Prevent sleep when plugged in:** System Settings → Battery → Power Adapter → Enable "Prevent automatic sleeping when display is off"
3. **Run multiple times per day:** Use `com.sheer.metafield-updater-multiple-times.plist` to run at 10 AM, 2 PM, 6 PM, and 10 PM

📖 **See [SLEEP-AND-SCHEDULING.md](SLEEP-AND-SCHEDULING.md) for detailed solutions and recommendations.**

---

## Prerequisites

1. ✅ Make sure your `.env` file is configured with valid credentials
2. ✅ The script will run the **LIVE update** (not dry-run) automatically
3. ✅ All results will be logged to the `logs/` directory
4. ✅ Node.js and npm packages must be installed

## Quick Setup (macOS - Recommended)

### Step 1: Navigate to Project Directory

```bash
cd /Users/cp12-crystal-mac/Documents/x/SHEER/Taiga-WIP
```

### Step 2: Make the Script Executable (if not already done)

```bash
chmod +x run-scheduled-update.sh
```

### Step 3: Test the Script Manually

```bash
./run-scheduled-update.sh
```

This will:
- Create a log file in `logs/metafield-update-YYYY-MM-DD_HH-MM-SS.log`
- Create a symlink `logs/latest.log` pointing to the newest log
- Show you exactly what will happen when it runs automatically

### Step 4: Install the Scheduled Job (launchd)

Run these commands **one at a time**:

```bash
# Copy the plist to LaunchAgents directory
cp com.sheer.metafield-updater.plist ~/Library/LaunchAgents/

# Load the job into launchd
launchctl load ~/Library/LaunchAgents/com.sheer.metafield-updater.plist

# Verify it's loaded and running
launchctl list | grep metafield-updater
```

**Expected output:**
```
-       0       com.sheer.metafield-updater
```

This means:
- **`-`** = Not currently running (it's scheduled for 6:00 PM)
- **`0`** = Last exit status (0 = success)
- **`com.sheer.metafield-updater`** = Your job is loaded ✅

🎉 **You're done!** The script will now run automatically every day at 6:00 PM.

---

## What Happens Now?

Every day at 6:00 PM, the script will:
1. ✅ Fetch all products from your Shopify store
2. ✅ Filter to only products created within the last 24 hours
3. ✅ Update metafields based on product tags
4. ✅ Skip metafields that already have correct values
5. ✅ Save a detailed log to `logs/metafield-update-YYYY-MM-DD_HH-MM-SS.log`

You can check the logs anytime by running:
```bash
cat logs/latest.log
```

---

## Managing the Scheduled Job

### Check if job is loaded:
```bash
launchctl list | grep metafield-updater
```

### Test run immediately (without waiting for 6 PM):
```bash
launchctl start com.sheer.metafield-updater
```

### Disable the job temporarily:
```bash
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

### Re-enable the job:
```bash
launchctl load ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

### Update the schedule and reload:
```bash
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
cp com.sheer.metafield-updater.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

## Alternative: Using Cron (Universal)

If you prefer using cron instead of launchd:

### Step 1: Edit Crontab

```bash
crontab -e
```

### Step 2: Add This Line

```bash
# Run metafield update daily at 6:00 PM
0 18 * * * cd /Users/cp12-crystal-mac/Documents/x/SHEER/Taiga-WIP && /bin/bash run-scheduled-update.sh
```

### Step 3: Save and Exit

Press `ESC`, then type `:wq` and press `ENTER` (if using vi/vim)

### Step 4: Verify Cron Job

```bash
crontab -l
```

## Viewing Logs

### Latest Log (Quick View)

```bash
cat logs/latest.log
```

### All Recent Logs

```bash
ls -lht logs/
```

### View Specific Log

```bash
cat logs/metafield-update-2025-11-07_18-00-01.log
```

### Follow Log in Real-Time

```bash
tail -f logs/latest.log
```

## Log Management

- Logs are automatically stored in the `logs/` directory
- Each run creates a new timestamped log file
- The `latest.log` symlink always points to the most recent log
- Logs older than 30 days are automatically deleted
- All output (including errors) is captured

## Customizing the Schedule

### Change Time (launchd)

Edit `com.sheer.metafield-updater.plist` and change:

```xml
<key>Hour</key>
<integer>18</integer>  <!-- Change to desired hour (0-23) -->
<key>Minute</key>
<integer>0</integer>   <!-- Change to desired minute (0-59) -->
```

Then reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
cp com.sheer.metafield-updater.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

### Change Time (cron)

Cron format: `minute hour day month weekday command`

Examples:
```bash
# Every day at 6:00 PM
0 18 * * * cd /path/to/project && ./run-scheduled-update.sh

# Every day at 9:30 AM
30 9 * * * cd /path/to/project && ./run-scheduled-update.sh

# Every Monday at 8:00 AM
0 8 * * 1 cd /path/to/project && ./run-scheduled-update.sh

# Twice daily: 9 AM and 6 PM
0 9,18 * * * cd /path/to/project && ./run-scheduled-update.sh
```

## Troubleshooting

### Issue: Terminal shows `quote>` prompt

If your terminal shows `quote>` after pasting commands:

**Cause:** You accidentally copied a special quote character or the terminal thinks you opened a quote.

**Solution:**
1. Press `Ctrl+C` to cancel
2. Copy and paste commands **one at a time** instead of all at once
3. Make sure you're copying plain text without any formatting

### Check if launchd Job is Running

```bash
launchctl list | grep metafield-updater
```

**What the output means:**
- If you see a line with `com.sheer.metafield-updater`, the job is loaded ✅
- First column: `-` (not running) or PID (currently running)
- Second column: Exit code of last run (0 = success)

### Check launchd Error Logs

```bash
cat logs/launchd-stderr.log
cat logs/launchd-stdout.log
```

### Test the Script Manually

```bash
cd /Users/cp12-crystal-mac/Documents/x/SHEER/Taiga-WIP
./run-scheduled-update.sh
```

This lets you see if the script works before relying on the scheduled job.

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x run-scheduled-update.sh
   ```

2. **Job not starting at scheduled time**
   - Check system time: `date`
   - Verify job is loaded: `launchctl list | grep metafield-updater`
   - Check for errors: `cat logs/launchd-stderr.log`
   - Mac must be awake and powered on at scheduled time

3. **Node not found**
   - Make sure Node.js is installed system-wide
   - Check Node path: `which node`
   - Or add the full path to node in `run-scheduled-update.sh`:
     ```bash
     /usr/local/bin/node bulk-update-metafields-from-tags.js
     ```

4. **Environment Variables not Loading**
   - Make sure `.env` file exists in the project directory
   - Check that dotenv is installed: `npm install dotenv`
   - Verify file has correct format (no spaces around `=`)

5. **Owner subtype errors**
   - These should be automatically prevented now
   - The script skips metafields that already have correct values
   - Check logs to see which products were skipped

## Email Notifications (Optional)

To receive email notifications when the job runs, you can modify `run-scheduled-update.sh` to send emails:

```bash
# At the end of run-scheduled-update.sh, add:
echo "Metafield update completed. See attached log." | mail -s "Shopify Metafield Update - $(date +%Y-%m-%d)" -A "$LOG_FILE" your-email@example.com
```

Note: This requires mail command to be configured on your system.

## Monitoring

Create a simple monitoring script `check-last-update.sh`:

```bash
#!/bin/bash
LATEST_LOG="logs/latest.log"
if [ -f "$LATEST_LOG" ]; then
    echo "Last update:"
    tail -n 20 "$LATEST_LOG"
else
    echo "No logs found"
fi
```

Then run: `./check-last-update.sh`

---

## Quick Reference Card

### Daily Commands

```bash
# View latest log
cat logs/latest.log

# List all logs
ls -lht logs/

# Check job status
launchctl list | grep metafield-updater

# Run manually right now
launchctl start com.sheer.metafield-updater
```

### When Things Go Wrong

```bash
# Test the script manually
cd /Users/cp12-crystal-mac/Documents/x/SHEER/Taiga-WIP
./run-scheduled-update.sh

# Check for errors
cat logs/launchd-stderr.log

# Restart the job
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
launchctl load ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

### To Stop/Disable

```bash
# Temporarily disable (until next reboot)
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist

# Permanently remove
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
rm ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

---

## Summary

✅ **Installed:** Daily job running at 6:00 PM  
✅ **Logs:** `logs/latest.log` always has newest results  
✅ **Safe:** Only updates products from last 24 hours  
✅ **Smart:** Skips metafields that already have correct values  

Need help? Check the troubleshooting section above or run the script manually to see detailed output.
