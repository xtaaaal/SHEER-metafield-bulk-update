const {
  getAllProducts,
  updateProductMetafields,
  hasMetafieldMappingTags,
  buildMetafieldUpdatePlan,
} = require('./bulk-update-metafields-from-tags.js');
const { loadMetafieldCategoryConstraints } = require('./metafield-category-constraints.js');

async function main(dryRun = false) {
  const mode = dryRun ? 'DRY RUN' : 'LIVE UPDATE';
  console.log(`\n🔄 FULL STORE SYNC: Tags → Metafields (${mode})`);
  console.log('═'.repeat(60));

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No actual updates will be made');
  } else {
    console.log('⚡ LIVE MODE: Products will be updated');
  }

  console.log('Processing ALL products with matching tags (no 24h / 7-day limit)\n');

  try {
    const constraints = await loadMetafieldCategoryConstraints();

    console.log('📦 Fetching all products from store...');
    const products = await getAllProducts();
    console.log(`📦 Found ${products.length} total products in store`);

    const productsToProcess = products.filter(hasMetafieldMappingTags);
    console.log(`🏷️  ${productsToProcess.length} product(s) have tag mappings to check\n`);

    if (productsToProcess.length === 0) {
      console.log('⚠️  No products with matching tags found.\n');
      return;
    }

    let processedCount = 0;
    let wouldUpdateCount = 0;
    let updatedCount = 0;
    let alreadyCorrectCount = 0;
    let skippedCategoryCount = 0;
    let failedCount = 0;

    for (const product of productsToProcess) {
      processedCount++;
      const plan = buildMetafieldUpdatePlan(product);
      const created = new Date(product.createdAt).toLocaleDateString();

      console.log(`[${processedCount}/${productsToProcess.length}] ${product.handle}`);
      console.log(`  Type: ${product.productType} | Created: ${created}`);

      if (!plan.hasMappings) {
        console.log('  ℹ️  No applicable metafield mappings for this product type');
        console.log('');
        continue;
      }

      if (plan.metafieldsToUpdate.length === 0) {
        alreadyCorrectCount++;
        console.log(`  ✅ All ${plan.alreadyCorrectCount} metafield(s) already correct`);
        console.log('');
        continue;
      }

      wouldUpdateCount++;
      const result = await updateProductMetafields(product, constraints, dryRun);

      if (result.updated) {
        updatedCount++;
      }
      if (result.skippedCategory) {
        skippedCategoryCount++;
      }
      if (result.failed) {
        failedCount++;
      }

      console.log('');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('═'.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total products in store:      ${products.length}`);
    console.log(`Products with mapping tags:     ${productsToProcess.length}`);
    console.log(`Products needing updates:     ${wouldUpdateCount}`);
    console.log(`Products updated:             ${updatedCount}`);
    console.log(`Products already in sync:     ${alreadyCorrectCount}`);
    console.log(`Skipped (category):           ${skippedCategoryCount}`);
    console.log(`Failed:                       ${failedCount}`);
    console.log('═'.repeat(60));

    if (dryRun) {
      console.log('\n💡 This was a DRY RUN. To apply changes, run:');
      console.log('   npm run sync-all\n');
    } else {
      console.log('\n✅ Full store sync completed!\n');
    }
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  main(dryRun);
}

module.exports = { main };
