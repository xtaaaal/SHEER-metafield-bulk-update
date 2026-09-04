const {
  TAG_METAFIELD_MAPPINGS,
  getAllProducts,
  updateProductMetafields,
  buildMetafieldUpdatePlan,
} = require('./bulk-update-metafields-from-tags.js');
const { loadMetafieldCategoryConstraints } = require('./metafield-category-constraints.js');

const LOUNGE_FIT_TAGS = Object.keys(TAG_METAFIELD_MAPPINGS).filter(
  (tag) => TAG_METAFIELD_MAPPINGS[tag].key === 'fit'
);

function hasLoungeFitTags(product) {
  return product.tags.some((tag) => LOUNGE_FIT_TAGS.includes(tag));
}

function getLoungeFitTags(product) {
  return product.tags.filter((tag) => LOUNGE_FIT_TAGS.includes(tag));
}

async function main(dryRun = false) {
  const mode = dryRun ? 'DRY RUN' : 'LIVE UPDATE';
  console.log(`\n👕 LOUNGE FIT SYNC: Tags → custom.fit (${mode})`);
  console.log('═'.repeat(60));

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No actual updates will be made');
  } else {
    console.log('⚡ LIVE MODE: Products will be updated');
  }

  console.log(`Tags checked: ${LOUNGE_FIT_TAGS.join(', ')}\n`);

  try {
    const constraints = await loadMetafieldCategoryConstraints();

    console.log('📦 Fetching all products from store...');
    const products = await getAllProducts();
    console.log(`📦 Found ${products.length} total products in store`);

    const productsToProcess = products.filter(hasLoungeFitTags);
    console.log(`🏷️  ${productsToProcess.length} product(s) have Lounge Fit tags\n`);

    if (productsToProcess.length === 0) {
      console.log('⚠️  No products with Lounge Fit tags found.\n');
      return;
    }

    let processedCount = 0;
    let wouldUpdateCount = 0;
    let updatedCount = 0;
    let alreadyCorrectCount = 0;
    let skippedCategoryCount = 0;
    let skippedProductTypeCount = 0;
    let failedCount = 0;

    for (const product of productsToProcess) {
      processedCount++;
      const plan = buildMetafieldUpdatePlan(product);
      const created = new Date(product.createdAt).toLocaleDateString();
      const loungeTags = getLoungeFitTags(product);

      console.log(`[${processedCount}/${productsToProcess.length}] ${product.handle}`);
      console.log(`  Type: ${product.productType} | Created: ${created}`);
      console.log(`  Tags: ${loungeTags.join(', ')}`);

      if (!plan.hasMappings) {
        skippedProductTypeCount++;
        console.log('  ℹ️  Lounge Fit metafield not valid for this product type');
        console.log('');
        continue;
      }

      if (plan.metafieldsToUpdate.length === 0) {
        alreadyCorrectCount++;
        console.log(`  ✅ custom.fit already correct`);
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
    console.log('📊 LOUNGE FIT SYNC SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total products in store:        ${products.length}`);
    console.log(`Products with Lounge Fit tags:  ${productsToProcess.length}`);
    console.log(`Products needing updates:       ${wouldUpdateCount}`);
    console.log(`Products updated:               ${updatedCount}`);
    console.log(`Products already in sync:       ${alreadyCorrectCount}`);
    console.log(`Skipped (product type):         ${skippedProductTypeCount}`);
    console.log(`Skipped (category):             ${skippedCategoryCount}`);
    console.log(`Failed:                         ${failedCount}`);
    console.log('═'.repeat(60));

    if (dryRun) {
      console.log('\n💡 This was a DRY RUN. To apply changes, run:');
      console.log('   npm run sync-lounge-fit\n');
    } else {
      console.log('\n✅ Lounge Fit sync completed!\n');
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

module.exports = { main, LOUNGE_FIT_TAGS, hasLoungeFitTags };
