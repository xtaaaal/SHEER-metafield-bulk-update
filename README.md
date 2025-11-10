# Shopify Metafield Bulk Updater

Automated tool to bulk update Shopify product metafields based on product tags, with support for cloud deployment on Render.com.

## 🚀 Quick Start

### Option 1: Cloud Deployment (Recommended)
Deploy to Render.com for automatic daily updates:
- See [QUICK-START-RENDER.md](QUICK-START-RENDER.md) for 5-minute setup
- Full guide: [RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md)

### Option 2: Run Locally
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Shopify credentials

# Test first
npm run dry-run

# Run the update
npm run update
```

## 📋 Documentation

- **[README-metafield-update.md](README-metafield-update.md)** - Complete usage guide
- **[RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md)** - Cloud deployment guide
- **[METAFIELDS-SCHEDULING.md](METAFIELDS-SCHEDULING.md)** - Local scheduling (macOS)
- **[SLEEP-AND-SCHEDULING.md](SLEEP-AND-SCHEDULING.md)** - Sleep mode considerations

## ⚙️ Features

- ✅ Bulk update product metafields from tags
- ✅ Filters products created within last 24 hours
- ✅ Smart updates (skips unchanged metafields)
- ✅ Dry-run mode for safe testing
- ✅ Cloud deployment ready (Render.com)
- ✅ Local scheduling support (macOS launchd/cron)

## 🔧 Configuration

The script uses tag-to-metafield mappings defined in `bulk-update-metafields-from-tags.js`. Customize the mappings to match your store's needs.

## 📝 License

MIT

