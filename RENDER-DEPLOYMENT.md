# Deploying Metafield Update Job to Render.com

## Overview

Deploy your scheduled metafield update job to [Render.com](https://render.com/) for reliable, always-on execution without needing to keep your MacBook running.

## 🎯 Why Deploy to Render?

**Problem with Local Setup:**
- ❌ Mac must stay awake at scheduled time
- ❌ Requires your computer to be on and connected
- ❌ Can miss runs if Mac is sleeping or off
- ❌ Manual maintenance required

**Benefits of Render:**
- ✅ **Always running** - No sleep mode issues
- ✅ **Automatic execution** - Runs on schedule reliably
- ✅ **Built-in logging** - Easy to view execution history
- ✅ **Zero maintenance** - Set it and forget it
- ✅ **Free tier available** - Perfect for cron jobs
- ✅ **Secure** - Environment variables encrypted

---

## Prerequisites

1. ✅ GitHub/GitLab/Bitbucket account
2. ✅ Render.com account (free to create)
3. ✅ Your project in a Git repository
4. ✅ Shopify Admin API credentials

---

## Step 1: Prepare Your Repository

### 1.1 Create a `render.yaml` file

Create this file in your project root:

```yaml
services:
  - type: cron
    name: shopify-metafield-updater
    env: node
    schedule: "0 18 * * *"  # Runs daily at 6:00 PM UTC
    buildCommand: npm install
    startCommand: node bulk-update-metafields-from-tags.js
    envVars:
      - key: SHOP_URL
        sync: false
      - key: ACCESS_TOKEN
        sync: false
```

### 1.2 Update `.gitignore`

Make sure your `.gitignore` includes:

```
.env
node_modules/
logs/
*.log
```

**⚠️ IMPORTANT:** Never commit your `.env` file with credentials!

### 1.3 Create `package.json` (if not exists)

```json
{
  "name": "shopify-metafield-updater",
  "version": "1.0.0",
  "description": "Automated Shopify metafield updates from product tags",
  "main": "bulk-update-metafields-from-tags.js",
  "scripts": {
    "start": "node bulk-update-metafields-from-tags.js",
    "test": "node bulk-update-metafields-from-tags.js --dry-run"
  },
  "dependencies": {
    "node-fetch": "^2.6.7",
    "dotenv": "^16.0.3"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### 1.4 Commit and Push

```bash
git add render.yaml package.json .gitignore
git commit -m "Add Render deployment configuration"
git push origin main
```

---

## Step 2: Deploy to Render

### 2.1 Sign Up/Login to Render

1. Go to [render.com](https://render.com/)
2. Click **"Get Started for Free"**
3. Sign up with GitHub/GitLab/Bitbucket

### 2.2 Create New Cron Job

1. Click **"New +"** → **"Cron Job"**
2. Connect your Git repository
3. Configure the cron job:

**Basic Settings:**
- **Name:** `shopify-metafield-updater`
- **Environment:** `Node`
- **Branch:** `main` (or your default branch)
- **Build Command:** `npm install`
- **Start Command:** `node bulk-update-metafields-from-tags.js`

**Schedule:**
- **Cron Expression:** `0 18 * * *` (Daily at 6:00 PM UTC)
- Or use their visual cron builder

**Alternative Schedules:**
```bash
0 18 * * *        # Daily at 6:00 PM UTC
0 10,14,18,22 * * *  # 4 times daily (10 AM, 2 PM, 6 PM, 10 PM UTC)
0 */6 * * *       # Every 6 hours
0 0 * * *         # Daily at midnight UTC
```

### 2.3 Add Environment Variables

In the Render dashboard, go to **Environment** tab and add:

| Key | Value | Example |
|-----|-------|---------|
| `SHOP_URL` | Your shop URL | `your-shop.myshopify.com` |
| `ACCESS_TOKEN` | Your Admin API token | `shpat_xxxxxxxxxxxxx` |

**⚠️ IMPORTANT:** Keep these values secret!

### 2.4 Deploy

1. Click **"Create Cron Job"**
2. Render will build and deploy automatically
3. First run will happen at the scheduled time

---

## Step 3: Monitor and Manage

### View Logs

1. Go to your cron job in Render dashboard
2. Click **"Logs"** tab
3. View execution history and output

### Manual Trigger

To run immediately (testing):
1. Go to your cron job
2. Click **"Trigger Run"**
3. View logs in real-time

### Update Schedule

1. Edit `render.yaml` in your repo:
```yaml
schedule: "0 10,14,18,22 * * *"  # 4 times daily
```
2. Commit and push
3. Render auto-deploys changes

---

## Time Zone Considerations

⚠️ **Render cron jobs run in UTC time by default**

To schedule for 6:00 PM in your local time zone:

### Hong Kong (HKT = UTC+8)
- Want: 6:00 PM HKT
- Set: `0 10 * * *` (10:00 AM UTC = 6:00 PM HKT)

### US Eastern (EST = UTC-5, EDT = UTC-4)
- Want: 6:00 PM EST
- Set: `0 23 * * *` (11:00 PM UTC = 6:00 PM EST)

### Use this formula:
```
UTC Hour = Local Hour - Timezone Offset
```

**Or run multiple times per day to catch your timezone:**
```yaml
schedule: "0 2,6,10,14,18,22 * * *"  # Every 4 hours
```

---

## Advanced Configuration

### Option 1: Multiple Schedules

Create separate cron jobs for different schedules:

**render.yaml:**
```yaml
services:
  - type: cron
    name: metafield-updater-morning
    env: node
    schedule: "0 2 * * *"
    buildCommand: npm install
    startCommand: node bulk-update-metafields-from-tags.js
    
  - type: cron
    name: metafield-updater-evening
    env: node
    schedule: "0 14 * * *"
    buildCommand: npm install
    startCommand: node bulk-update-metafields-from-tags.js
```

### Option 2: Webhook Trigger

Create a Web Service that responds to webhooks:

**render.yaml:**
```yaml
services:
  - type: web
    name: metafield-webhook
    env: node
    buildCommand: npm install
    startCommand: node server.js
```

**server.js:**
```javascript
const express = require('express');
const { main } = require('./bulk-update-metafields-from-tags.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.post('/update-metafields', async (req, res) => {
  try {
    await main(false); // Run live update
    res.json({ success: true, message: 'Metafields updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Option 3: Background Worker

For continuous processing:

**render.yaml:**
```yaml
services:
  - type: worker
    name: metafield-processor
    env: node
    buildCommand: npm install
    startCommand: node worker.js
```

---

## Pricing

### Free Tier
- ✅ **Cron Jobs:** Free up to 750 hours/month
- ✅ Perfect for scheduled tasks
- ✅ Automatic sleep after execution
- ✅ No credit card required

### Paid Tiers
- **Starter:** $7/month
- **Pro:** $25/month
- Only needed for always-on services

**For cron jobs, the free tier is sufficient!**

---

## Comparison: Local vs Render

| Feature | Local (MacBook) | Render Cloud |
|---------|----------------|--------------|
| **Always Running** | ❌ Mac must be on | ✅ Always available |
| **Sleep Issues** | ❌ Skips if sleeping | ✅ No sleep issues |
| **Reliability** | ⚠️ Depends on Mac | ✅ Enterprise-grade |
| **Maintenance** | ❌ Manual updates | ✅ Auto-updates |
| **Logs** | 📂 Local files | ☁️ Cloud dashboard |
| **Cost** | Free (uses Mac) | Free tier available |
| **Setup Complexity** | ⚠️ Medium | ✅ Easy |
| **Power Required** | ❌ Mac must be on | ✅ No local power |

---

## Migration from Local to Render

### Step 1: Test Locally First
```bash
npm install
node bulk-update-metafields-from-tags.js --dry-run
```

### Step 2: Push to Git
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 3: Deploy to Render
Follow steps in "Step 2: Deploy to Render" above

### Step 4: Disable Local Schedule
```bash
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

### Step 5: Monitor First Run
Check Render logs to ensure successful execution

---

## Troubleshooting

### Issue: Build Failed

**Solution:**
1. Check `package.json` has correct dependencies
2. Ensure `node-fetch` version is compatible (use v2.x)
3. View build logs in Render dashboard

### Issue: Environment Variables Not Working

**Solution:**
1. Verify variables are set in Render Environment tab
2. Variable names must match exactly: `SHOP_URL`, `ACCESS_TOKEN`
3. Re-deploy after adding variables

### Issue: Wrong Time Zone

**Solution:**
1. Convert your local time to UTC
2. Update `schedule` in `render.yaml`
3. Or use multiple runs throughout the day

### Issue: Script Fails to Run

**Solution:**
1. Check logs in Render dashboard
2. Verify Shopify credentials are correct
3. Test locally first with same Node version

---

## Best Practices

1. ✅ **Use environment variables** - Never commit credentials
2. ✅ **Test locally first** - Run dry-run before deploying
3. ✅ **Monitor logs** - Check first few runs for issues
4. ✅ **Set up notifications** - Use Render's Slack integration
5. ✅ **Version control** - Keep `render.yaml` in Git
6. ✅ **Document changes** - Update README with deployment info

---

## Additional Resources

- [Render Cron Jobs Documentation](https://render.com/docs/cronjobs)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Render Blueprint Spec](https://render.com/docs/blueprint-spec)
- [Cron Expression Guide](https://crontab.guru/)

---

## Summary

✅ **Recommended Solution:** Deploy to Render.com  
✅ **Cost:** Free tier is sufficient  
✅ **Reliability:** Enterprise-grade, always-on  
✅ **Setup Time:** 10-15 minutes  
✅ **Maintenance:** Zero - fully automated  

**Deploy once, run forever!** 🚀

