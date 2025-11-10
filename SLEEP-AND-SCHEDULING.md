# MacBook Sleep and Scheduled Jobs

## The Problem

**Scheduled jobs will NOT run if your MacBook is sleeping.** 

If your Mac is asleep at the scheduled time (6:00 PM), the job will be skipped for that day and won't catch up later.

---

## Solutions

### Option 1: Prevent Sleep When Plugged In (Best for Office/Desk Setup)

#### Via System Settings (Persistent):

1. Open **System Settings** (or System Preferences)
2. Go to **Battery** (or **Energy Saver** on older macOS)
3. Click **Power Adapter** tab
4. **Enable:** "Prevent automatic sleeping when the display is off"
5. Or adjust "Turn display off after" to your preference

This keeps your Mac awake when plugged in, but allows the display to turn off.

#### Via Command Line (Temporary):

```bash
# Keep Mac awake for 3 hours
caffeinate -u -t 10800

# Keep Mac awake until you press Ctrl+C
caffeinate -u

# Keep Mac awake while running a specific command
caffeinate -u ./run-scheduled-update.sh
```

---

### Option 2: Run Multiple Times Per Day (Recommended)

Instead of running once at 6 PM, run at multiple times to catch the Mac when it's awake.

**I've created an alternative schedule file for you:**
- `com.sheer.metafield-updater-multiple-times.plist`

This runs at: **10 AM, 2 PM, 6 PM, and 10 PM**

The script is smart enough to:
- ✅ Only process products from last 24 hours
- ✅ Skip metafields that already have correct values
- ✅ Won't duplicate work if it runs multiple times

#### To Switch to Multiple Times Schedule:

```bash
# 1. Unload current job
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist

# 2. Copy the new schedule
cp com.sheer.metafield-updater-multiple-times.plist ~/Library/LaunchAgents/com.sheer.metafield-updater.plist

# 3. Load the new schedule
launchctl load ~/Library/LaunchAgents/com.sheer.metafield-updater.plist

# 4. Verify
launchctl list | grep metafield-updater
```

#### To Switch Back to Once Daily:

```bash
# 1. Unload current job
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist

# 2. Restore original schedule
cp com.sheer.metafield-updater.plist ~/Library/LaunchAgents/com.sheer.metafield-updater.plist

# 3. Reload
launchctl load ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

---

### Option 3: Run on Wake (Advanced)

Create a job that runs when the Mac wakes from sleep:

**Note:** This is more complex and may run frequently if your Mac sleeps/wakes often.

You would need to add to the plist:
```xml
<key>StartOnMount</key>
<true/>
```

Or use a LaunchAgent with `QueueDirectories` watching for system events.

---

### Option 4: Manual Trigger

If you prefer manual control, you can trigger the job anytime:

```bash
# Run immediately
launchctl start com.sheer.metafield-updater

# Or run the script directly
cd /Users/cp12-crystal-mac/Documents/x/SHEER/Taiga-WIP
./run-scheduled-update.sh
```

---

## Checking If Job Ran

### View Logs
```bash
# Latest log
cat logs/latest.log

# Check timestamp of last run
ls -lh logs/latest.log
```

### Check LaunchAgent Status
```bash
# See status
launchctl list | grep metafield-updater

# Output explanation:
# -       0       com.sheer.metafield-updater
# ^       ^       ^
# |       |       +-- Job name
# |       +-- Exit code (0 = success)
# +-- PID (- means not running now)
```

---

## Recommendations

### For Daily Import Workflows:

If you import products once per day at a specific time, keep the **single 6 PM schedule** and either:
- Keep your Mac awake when plugged in
- Manually run the job after imports

### For Continuous/Random Imports:

Use the **multiple times per day** schedule (10 AM, 2 PM, 6 PM, 10 PM) so it catches products whenever the Mac is awake.

### For Maximum Reliability:

1. Use **multiple times per day** schedule
2. Enable "Prevent sleep when plugged in"
3. Check logs periodically to ensure it's running

---

## Why the Script is Safe to Run Multiple Times

The script won't cause problems if it runs multiple times because:

1. ✅ **24-hour filter** - Only processes products created in last 24 hours
2. ✅ **Smart comparison** - Skips metafields that already have correct values
3. ✅ **Idempotent** - Running it twice produces the same result as running once
4. ✅ **Rate limited** - Has delays to avoid API limits

So if you use the "multiple times per day" schedule, it will just skip products that were already processed in an earlier run.

---

## Quick Decision Guide

**Choose this if...**

| Scenario | Solution |
|----------|----------|
| Mac is always plugged in at desk | Option 1: Prevent sleep when plugged in |
| Mac sleeps frequently | Option 2: Multiple times per day |
| Products imported randomly throughout day | Option 2: Multiple times per day |
| Products imported at specific time | Keep single schedule, prevent sleep |
| You want full control | Option 4: Manual trigger |
| Mac is often in bag/closed | Option 2 + Option 1 combined |

---

## Testing

Test your chosen solution:

```bash
# 1. Check current schedule
launchctl list | grep metafield-updater

# 2. Manually trigger a test run
launchctl start com.sheer.metafield-updater

# 3. Watch the log in real-time
tail -f logs/latest.log

# 4. Verify it completed
cat logs/latest.log | grep "Completed"
```

---

## Summary

❌ **Jobs DON'T run when Mac is sleeping**  
✅ **Jobs DO run when Mac is awake (even if locked)**  

**Best solution:** Use multiple times per day schedule + prevent sleep when plugged in = Maximum reliability! 🎯

