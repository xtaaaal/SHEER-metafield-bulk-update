# Quick Start: Deploy to Render.com in 5 Minutes

Deploy your metafield update job to the cloud and never worry about Mac sleep mode again!

## ⚡ Quick Setup (5 Minutes)

### Step 1: Push to Git (2 min)

```bash
# Make sure your code is committed
git add render.yaml package.json
git commit -m "Add Render deployment config"
git push origin main
```

### Step 2: Deploy to Render (3 min)

1. **Go to [render.com](https://render.com/)** and sign up (free)
2. Click **"New +"** → **"Cron Job"**
3. Connect your GitHub/GitLab repo
4. Render auto-detects `render.yaml` - click **"Apply"**
5. Add environment variables:
   - `SHOP_URL` = `your-shop.myshopify.com`
   - `ACCESS_TOKEN` = `shpat_xxxxxxxxxxxxx`
6. Click **"Create Cron Job"**

**Done!** ✅ Your job will run daily at 6:00 PM UTC automatically.

---

## 🕐 Adjust Schedule for Your Timezone

**Render runs in UTC time.** Adjust the schedule in `render.yaml`:

```yaml
# Hong Kong (UTC+8): Want 6 PM HKT → Use 10 AM UTC
schedule: "0 10 * * *"

# US Eastern (UTC-5): Want 6 PM EST → Use 11 PM UTC  
schedule: "0 23 * * *"

# Multiple times per day (every 6 hours)
schedule: "0 */6 * * *"

# Four times daily: 6 AM, 12 PM, 6 PM, 12 AM UTC
schedule: "0 6,12,18,0 * * *"
```

After changing, commit and push - Render auto-deploys!

---

## 📊 View Logs

1. Go to Render dashboard
2. Click your cron job
3. Click **"Logs"** tab
4. See execution history

---

## 🧪 Test Run

**Manual trigger (don't wait for schedule):**

1. Go to your cron job in Render
2. Click **"Trigger Run"**
3. Watch logs in real-time

---

## 🔄 Disable Local Mac Schedule

Once Render is working, disable your local Mac job:

```bash
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

---

## 💰 Cost

**FREE!** Cron jobs on Render are free up to 750 hours/month.

Since your job runs once daily for ~1 minute, you'll use:
- 1 minute × 30 days = 30 minutes/month
- Well within the free tier! ✅

---

## 🆘 Troubleshooting

### Build Failed?
- Check that `package.json` has `"start"` script
- Verify `node-fetch` version is `^2.6.7`

### Job Not Running?
- Check schedule is in UTC
- Verify environment variables are set
- View logs for error messages

### Wrong Time?
- Convert your time to UTC
- Update `schedule` in `render.yaml`
- Commit and push to update

---

## ✅ Benefits Over Local Setup

| Feature | Local Mac | Render Cloud |
|---------|-----------|--------------|
| Requires Mac on | ❌ Yes | ✅ No |
| Sleep issues | ❌ Yes | ✅ No |
| Reliability | ⚠️ Medium | ✅ High |
| Maintenance | ❌ Manual | ✅ Zero |
| Cost | Free | Free |
| Setup | 15 min | 5 min |

---

## 📚 Full Documentation

See [RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md) for:
- Advanced configuration
- Multiple schedules
- Webhook triggers
- Monitoring setup
- Best practices

---

**Questions?** Check the [Render Docs](https://render.com/docs/cronjobs) or [open an issue](https://github.com/render-examples/cron-job).

🚀 **Deploy once, run forever!**

