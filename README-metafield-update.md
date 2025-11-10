# Shopify Metafield Bulk Update Script

This script automatically updates product metafields based on product tags using Shopify's Admin API.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Shopify Admin API Access Token

1. In your Shopify admin, go to **Apps** → **App and sales channel settings**
2. Click **Develop apps for your store**
3. Click **Create an app**
4. Name it "Metafield Updater" 
5. Click **Configure Admin API scopes**
6. Enable these permissions:
   - `read_products`
   - `write_products` 
   - `read_product_listings`
   - `write_product_listings`
7. Click **Save**
8. Click **Install app**
9. Copy the **Admin API access token**

### 3. Configure Environment

1. Copy `env.example` to `.env`:
```bash
cp env.example .env
```

2. Edit `.env` and add your details:
```
SHOP_URL=your-shop.myshopify.com
ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Tag → Metafield Mappings

The script will update these metafields based on product tags:

### Bra Products
- **custom.padding_level**: Bra-cup-open → Open, Bra-non-padded → Non-Padded, etc.
- **custom.support_level**: Bra-light-support → Light Support, etc. 
- **custom.wiring**: Bra-underwire → Wired, Bra-wireless → Wireless
- **shopify.bra-features**: Bra-invisible-seamless → Invisible, etc.

### Underwear Products  
- **custom.rise**: Und-low-rise → Low Rise, etc.
- **custom.coverage**: Und-open → Open, etc.

### Lounge Products
- **custom.fit**: Lounge-tight-fit → Tight Fit, etc.

## Usage

### 1. Test First (Dry Run)
```bash
npm run dry-run
```
This shows what would be updated without making changes.

### 2. Run the Update
```bash
npm run update
```
This performs the actual updates.

### 3. Alternative Commands
```bash
# Dry run
node bulk-update-metafields-from-tags.js --dry-run

# Live update  
node bulk-update-metafields-from-tags.js
```

### 4. Scheduling Automatic Updates

To run the script automatically every day at 6:00 PM with logging:

#### Option A: Cloud Deployment (Recommended) ⭐

Deploy to [Render.com](https://render.com/) for enterprise-grade reliability:
- ✅ Always running (no sleep issues)
- ✅ Zero maintenance
- ✅ Free tier available

**Quick start:**
```bash
git push origin main
# Then follow: QUICK-START-RENDER.md (5 minutes)
```

📖 **Full guide:** [RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md)

#### Option B: Local Mac Deployment

Run on your MacBook (requires Mac to be awake):

```bash
# Make script executable
chmod +x run-scheduled-update.sh

# Test it manually first
./run-scheduled-update.sh

# Then follow instructions in METAFIELDS-SCHEDULING.md
```

📖 **Full guide:** [METAFIELDS-SCHEDULING.md](METAFIELDS-SCHEDULING.md) for:
- **launchd** (recommended for macOS)
- **cron** (universal)

### 5. Fix Specific Issues

#### Padding Level Fix for "Bra-cup-open" Tag
If you need to specifically update products with the "Bra-cup-open" tag to have "Open" padding level:

```bash
# Test the fix first
npm run fix-padding-level-dry

# Apply the fix
npm run fix-padding-level
```

This focused script will:
- Find all products with "Bra-cup-open" tag
- Only update products of type "Bras"
- Set `custom.padding_level` to `["Open"]`
- Skip products that already have the correct value

## What the Script Does

1. **Fetches all products** from your Shopify store
2. **Filters products** to only those created within the last 24 hours
3. **Checks each product's tags** against the mapping table
4. **Updates metafields** for products with matching tags
5. **Logs progress** and any errors
6. **Rate limits** requests to avoid API limits

**Note:** The script will only process products that were created within the last 24 hours. This is helpful for updating newly imported or created products without affecting your entire catalog.

## Safety Features

- ✅ **Dry run mode** to preview changes
- ✅ **Smart updates** - skips metafields that already have correct values
- ✅ **Error handling** and logging
- ✅ **Rate limiting** (100ms delay between requests)
- ✅ **Validation** of configuration
- ✅ **Progress tracking**
- ✅ **Product type validation** - only updates metafields valid for each product type

## Sample Output

```
🚀 Starting bulk metafield update from tags... (DRY RUN)

⚠️  DRY RUN MODE: No actual updates will be made

📦 Fetching all products...
📦 Found 150 products total
📅 3 products created within last 24 hours

[1/3] Processing: signature-black-lace-bra (created: 2025-11-06T15:30:00Z)
  → Setting custom.padding_level = "Padded" (from tag: Bra-padded)
  → Setting custom.support_level = "Classic Support" (from tag: Bra-classic-support)
  🔍 Would update 2 metafield(s) on signature-black-lace-bra (DRY RUN)

[2/3] Processing: daily-push-up-bra (created: 2025-11-07T09:15:00Z)
  → Setting custom.padding_level = "Push-Up" (from tag: Bra-push-up)
  ✓ Skipping custom.padding_level - already has correct value
  ℹ️  All 1 metafield(s) already correct for daily-push-up-bra

[3/3] Processing: comfort-wireless-bra (created: 2025-11-07T10:00:00Z)
  → Setting custom.wiring = "Wireless" (from tag: Bra-wireless)
  🔍 Would update 1 metafield(s) on comfort-wireless-bra (DRY RUN)

✅ Completed! Updated 2 out of 3 products (from 150 total products in store).
```
