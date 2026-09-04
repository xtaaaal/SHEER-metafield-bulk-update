# SHEER Shopify Metafield Updater

Automated tool that keeps SHEER product metafields in sync with product tags on Shopify. When new products are imported or created, this script reads their tags and writes the matching metafield values — so storefront filters and product attributes stay accurate without manual editing.

---

## What This Tool Does

When products are tagged in Shopify (e.g. `Bra-padded`, `Und-high-rise`), this script automatically sets the corresponding metafield values on those products.

**Workflow:**

1. Connects to the SHEER Shopify store via the Admin API
2. Fetches all products and processes:
   - **New:** created within the last **24 hours**
   - **Retry:** created within the last **7 days**, previously blocked by category, now with a valid category and pending metafields
3. Checks each product's tags against a predefined mapping table
4. Updates matching metafields (skips values that are already correct)
5. Logs progress and any errors

**Product category required:** Metafields are restricted to specific Shopify Product categories (Settings → Custom data). The script loads those rules from Shopify and **skips** products with a missing or invalid category instead of failing with `Owner subtype does not match the metafield definition's constraints`. Once category is fixed, the cron **retries automatically for up to 7 days** after the product was created.

**Why only the last 24 hours for new products?** Newly imported or created products are the ones that need metafields set. The **7-day retry window** catches products whose category was fixed after the first cron run.

### Tag → Metafield Mappings

Mappings are defined in `bulk-update-metafields-from-tags.js`. Current mappings:

| Category | Product Tags (examples) | Metafield Updated |
|----------|------------------------|-------------------|
| **Bras** | `Bra-padded`, `Bra-wireless`, `Bra-light-support` | `custom.padding_level`, `custom.support_level`, `custom.wiring`, `shopify.bra-features` |
| **Underwear** | `Und-low-rise`, `Und-cheeky`, `Und-full-coverage` | `custom.rise`, `custom.coverage` |
| **Lounge** | `Lounge-relaxed`, `Lounge-slim`, `Lounge-body-hugging` | `custom.fit` |

**Lounge Fit** (`custom.fit`):

| Product tag | Metafield value |
|-------------|-----------------|
| `Lounge-relaxed` | Relaxed Fit |
| `Lounge-slim` | Slim Fit |
| `Lounge-body-hugging` | Body Hugging |

To add or change a mapping, edit the `TAG_METAFIELD_MAPPINGS` object in `bulk-update-metafields-from-tags.js`.

### Safety Features

- **Dry-run mode** — preview changes without writing anything
- **Smart updates** — skips metafields that already have the correct value
- **Category validation** — skips products until Product category matches Shopify metafield settings
- **Rate limiting** — avoids hitting Shopify API limits
- **Validation** — checks credentials and configuration before running

---

## Prerequisites

Before running locally or deploying to a server, you need:

1. **Node.js** (v18 or later recommended) — [nodejs.org](https://nodejs.org/)
2. **Shopify Admin API access token** with these scopes:
   - `read_products`
   - `write_products`
   - `read_product_listings`
   - `write_product_listings`

**How to get the access token:**

1. In Shopify Admin → **Apps** → **App and sales channel settings**
2. Click **Develop apps for your store** → **Create an app**
3. Name it (e.g. "Metafield Updater")
4. Under **Configure Admin API scopes**, enable the permissions listed above
5. Click **Save** → **Install app**
6. Copy the **Admin API access token** (`shpat_...`)

---

## Option 1: Run Locally (on a Mac)

Use this for one-off runs, testing, or scheduling on a Mac that stays awake.

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env

# 3. Edit .env with SHEER store credentials
#    SHOP_URL=sheer-2.myshopify.com
#    ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Run Manually

Always test with a dry run first:

```bash
# Preview what would change (no writes)
npm run dry-run

# Apply the updates
npm run update
```

### Schedule on a Mac (automatic daily runs)

To run automatically on a Mac (e.g. daily at 6 PM), use macOS launchd:

```bash
# Make the helper script executable
chmod +x run-scheduled-update.sh

# Test it manually first
./run-scheduled-update.sh
```

Then follow **[METAFIELDS-SCHEDULING.md](METAFIELDS-SCHEDULING.md)** to install the launchd job.

> **Note:** A local Mac must be powered on and awake at the scheduled time. If the Mac sleeps, the job will not run. See **[SLEEP-AND-SCHEDULING.md](SLEEP-AND-SCHEDULING.md)** for details.

---

## Option 2: Deploy to a Server (Render.com) — Recommended

Deploy to [Render.com](https://render.com/) as a cron job so updates run automatically in the cloud — no Mac required, no sleep issues.

### Quick Deploy (≈5 minutes)

**Step 1 — Push code to Git**

```bash
git add .
git commit -m "Deploy metafield updater"
git push origin main
```

**Step 2 — Create the cron job on Render**

1. Go to [render.com](https://render.com/) and sign in
2. Click **New +** → **Cron Job**
3. Connect this GitHub/GitLab repository
4. Render auto-detects `render.yaml` — click **Apply**
5. Add environment variables in the Render dashboard:
   - `SHOP_URL` = `sheer-2.myshopify.com`
   - `ACCESS_TOKEN` = `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. Click **Create Cron Job**

**Done.** The job runs on the schedule defined in `render.yaml` (currently 4 times daily at HKT: 9 AM, 3 PM, 6 PM, 12 AM).

### Adjust the Schedule

Render uses **UTC time**. Edit `render.yaml` to change when the job runs:

```yaml
# Hong Kong (UTC+8): 6 PM HKT → 10 AM UTC
schedule: "0 10 * * *"

# Once daily at 6 PM HKT (current default in render.yaml runs 4× daily)
schedule: "0 1,7,10,16 * * *"
```

Commit and push — Render redeploys automatically.

### Test & Monitor

- **Manual test:** In the Render dashboard → your cron job → **Trigger Run**
- **View logs:** Render dashboard → your cron job → **Logs** tab
- **Cost:** Free tier covers this easily (~1 min/day)

Full deployment guide: **[QUICK-START-RENDER.md](QUICK-START-RENDER.md)** and **[RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md)**

### Disable Local Schedule After Cloud Deploy

Once Render is running reliably, disable the Mac schedule to avoid duplicate runs:

```bash
launchctl unload ~/Library/LaunchAgents/com.sheer.metafield-updater.plist
```

---

## Local vs. Server — Which to Use?

| | Local (Mac) | Server (Render) |
|---|-------------|-----------------|
| **Best for** | Testing, one-off fixes | Production daily automation |
| **Mac must be on** | Yes | No |
| **Sleep issues** | Yes — job may be missed | No |
| **Setup time** | ~15 min | ~5 min |
| **Cost** | Free | Free (Render free tier) |
| **Maintenance** | Manual | Automatic |

**Recommendation:** Use **Render** for production. Use **local** for testing changes or running a one-off update.

---

## Available Commands

| Command | What it does |
|---------|-------------|
| `npm run dry-run` | Preview updates without writing (always run this first) |
| `npm run update` | Apply metafield updates to Shopify (24h new + 7-day category retry) |
| `npm run sync-all-dry` | Preview updates for **all products** with matching tags (no date limit) |
| `npm run sync-all` | Apply metafield updates for **all products** with matching tags |
| `npm run sync-lounge-fit-dry` | Preview **Lounge Fit** products only (`custom.fit` from Lounge tags) |
| `npm run sync-lounge-fit` | Apply **Lounge Fit** metafield updates only |
| `npm run fix-padding-level-dry` | Preview a targeted fix for `Bra-open` padding level |
| `npm run fix-padding-level` | Apply the targeted padding level fix |

---

## Further Documentation

| Document | Contents |
|----------|----------|
| **[README-metafield-update.md](README-metafield-update.md)** | Full usage guide, sample output, troubleshooting |
| **[QUICK-START-RENDER.md](QUICK-START-RENDER.md)** | 5-minute Render deployment walkthrough |
| **[RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md)** | Advanced cloud deployment and monitoring |
| **[METAFIELDS-SCHEDULING.md](METAFIELDS-SCHEDULING.md)** | macOS launchd and cron scheduling |
| **[SLEEP-AND-SCHEDULING.md](SLEEP-AND-SCHEDULING.md)** | Why Mac sleep affects local scheduling |

---

## License

MIT
