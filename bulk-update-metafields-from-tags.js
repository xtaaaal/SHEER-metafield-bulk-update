const fetch = require('node-fetch');
require('dotenv').config();

const {
  loadMetafieldCategoryConstraints,
  getCategoryRecommendation,
} = require('./metafield-category-constraints.js');

// Configuration - Load from .env file
const SHOP_URL = process.env.SHOP_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// Validation
if (!SHOP_URL) {
  console.error('❌ Please set SHOP_URL in your .env file');
  console.error('   Example: SHOP_URL=your-shop.myshopify.com');
  process.exit(1);
}

if (!ACCESS_TOKEN) {
  console.error('❌ Please set ACCESS_TOKEN in your .env file');
  console.error('   Example: ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  console.error('   Get it from: Shopify Admin → Apps → Develop apps → Create app → Admin API access token');
  process.exit(1);
}

// Tag to Metafield mappings
const TAG_METAFIELD_MAPPINGS = {
  // Padding Level (list type) - Fixed exact validation values
  'Bra-open': { namespace: 'custom', key: 'padding_level', value: ['Open'], type: 'list.single_line_text_field' },
  'Bra-non-padded': { namespace: 'custom', key: 'padding_level', value: ['Non-Padded'], type: 'list.single_line_text_field' },
  'Bra-lightly-padded': { namespace: 'custom', key: 'padding_level', value: ['Lightly-Padded'], type: 'list.single_line_text_field' },
  'Bra-padded': { namespace: 'custom', key: 'padding_level', value: ['Padded'], type: 'list.single_line_text_field' },
  'Bra-push-up': { namespace: 'custom', key: 'padding_level', value: ['Push-up'], type: 'list.single_line_text_field' },
  
  // Support Level (list type)
  'Bra-light-support': { namespace: 'custom', key: 'support_level', value: ['Light Support'], type: 'list.single_line_text_field' },
  'Bra-classic-support': { namespace: 'custom', key: 'support_level', value: ['Classic Support'], type: 'list.single_line_text_field' },
  'Bra-strong-support': { namespace: 'custom', key: 'support_level', value: ['Strong Support'], type: 'list.single_line_text_field' },
  
  // Wiring (list type)
  'Bra-underwire': { namespace: 'custom', key: 'wiring', value: ['Wired'], type: 'list.single_line_text_field' },
  'Bra-wireless': { namespace: 'custom', key: 'wiring', value: ['Wireless'], type: 'list.single_line_text_field' },
  
  // Bra Features (metaobject reference type)
  'Bra-invisible-seamless': { namespace: 'shopify', key: 'bra-features', value: ['gid://shopify/Metaobject/121490276435'], type: 'list.metaobject_reference' }, // Invisible
  'Bra-lifting-centering': { namespace: 'shopify', key: 'bra-features', value: ['gid://shopify/Metaobject/121490374739'], type: 'list.metaobject_reference' }, // Lifting  
  'Bra-seamless': { namespace: 'shopify', key: 'bra-features', value: ['gid://shopify/Metaobject/121490243667'], type: 'list.metaobject_reference' }, // Seamless
  'Bra-centering': { namespace: 'shopify', key: 'bra-features', value: ['gid://shopify/Metaobject/121490309203'], type: 'list.metaobject_reference' }, // Centering
  'Bra-underwire-support': { namespace: 'shopify', key: 'bra-features', value: ['gid://shopify/Metaobject/114411634771'], type: 'list.metaobject_reference' }, // Underwire Support
  

  // Underwear Rise (list type)
  'Und-low-rise': { namespace: 'custom', key: 'rise', value: ['Low Rise'], type: 'list.single_line_text_field' },
  'Und-mid-rise': { namespace: 'custom', key: 'rise', value: ['Mid Rise'], type: 'list.single_line_text_field' },
  'Und-high-rise': { namespace: 'custom', key: 'rise', value: ['High Rise'], type: 'list.single_line_text_field' },
  
  // Underwear Coverage (list type) - Updated to match Shopify validations  
  'Und-open': { namespace: 'custom', key: 'coverage', value: ['Open'], type: 'list.single_line_text_field' },
  'Und-minimal': { namespace: 'custom', key: 'coverage', value: ['Minimal'], type: 'list.single_line_text_field' },
  'Und-cheeky': { namespace: 'custom', key: 'coverage', value: ['Cheeky'], type: 'list.single_line_text_field' },
  'Und-standard': { namespace: 'custom', key: 'coverage', value: ['Standard'], type: 'list.single_line_text_field' },
  'Und-full-coverage': { namespace: 'custom', key: 'coverage', value: ['Full Coverage'], type: 'list.single_line_text_field' },
  
  // Lounge Fit (list type) - Updated to match Shopify validations
  'Lounge-relaxed': { namespace: 'custom', key: 'fit', value: ['Relaxed Fit'], type: 'list.single_line_text_field' },
  'Lounge-slim': { namespace: 'custom', key: 'fit', value: ['Slim Fit'], type: 'list.single_line_text_field' },
  'Lounge-body-hugging': { namespace: 'custom', key: 'fit', value: ['Body Hugging'], type: 'list.single_line_text_field' },
};

const CATEGORY_RETRY_DAYS = 7;

// GraphQL queries
const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          tags
          productType
          createdAt
          category {
            id
            fullName
          }
          metafields(first: 50) {
            edges {
              node {
                namespace
                key
                value
                type
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const UPDATE_PRODUCT_METAFIELDS_MUTATION = `
  mutation updateProductMetafields($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        metafields(first: 50) {
          edges {
            node {
              namespace
              key
              value
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Product type restrictions based on our investigation - STRICT MODE
function isMetafieldValidForProductType(mapping, productType) {
  const fieldKey = `${mapping.namespace}.${mapping.key}`;
  
  // Underwear-only metafields - STRICT
  if (fieldKey === 'custom.underwear_features' || fieldKey === 'custom.rise' || fieldKey === 'custom.coverage') {
    return productType === 'Underwear';
  }
  
  // Bra-only metafields - STRICT  
  if (fieldKey === 'shopify.bra-coverage' || fieldKey === 'shopify.bra-features') {
    return productType === 'Bras';
  }
  
  // Bra metafields - ONLY for actual Bras (not Bodywear)
  if (fieldKey === 'custom.support_level' || fieldKey === 'custom.padding_level' || fieldKey === 'custom.wiring') {
    return productType === 'Bras';
  }
  
  // Fit is for Lounge/other types
  if (fieldKey === 'custom.fit') {
    return productType === 'Loungewear' || productType === 'Bodywear' || productType === 'Sleepwear';
  }
  
  // Default: DENY unknown metafields to be safe
  return false;
}

// Check if product was created within the last 24 hours
function isCreatedWithin24Hours(createdAt) {
  return isCreatedWithinDays(createdAt, 1);
}

function isCreatedWithinDays(createdAt, days) {
  const productCreatedTime = new Date(createdAt);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return productCreatedTime >= cutoff;
}

function hasMetafieldMappingTags(product) {
  return product.tags.some((tag) => TAG_METAFIELD_MAPPINGS[tag]);
}

function buildMetafieldUpdatePlan(product, options = {}) {
  const { verbose = false } = options;
  const existingMetafields = new Map();

  if (product.metafields && product.metafields.edges) {
    product.metafields.edges.forEach((edge) => {
      const key = `${edge.node.namespace}.${edge.node.key}`;
      existingMetafields.set(key, edge.node.value);
    });
  }

  const metafieldMap = new Map();
  let hasMappings = false;

  for (const tag of product.tags) {
    const mapping = TAG_METAFIELD_MAPPINGS[tag];
    if (!mapping) {
      continue;
    }

    const key = `${mapping.namespace}.${mapping.key}`;

    if (!isMetafieldValidForProductType(mapping, product.productType)) {
      if (verbose) {
        console.log(`  ⏭️  Skipping ${mapping.namespace}.${mapping.key} - not valid for product type "${product.productType}" (from tag: ${tag})`);
      }
      continue;
    }

    hasMappings = true;

    if (metafieldMap.has(key)) {
      const existing = metafieldMap.get(key);
      const existingValues = JSON.parse(existing.value);
      const newValues = [...new Set([...existingValues, ...mapping.value])];
      existing.value = JSON.stringify(newValues);
      if (verbose) {
        console.log(`  → Merging ${mapping.namespace}.${mapping.key} += "${mapping.value}" (from tag: ${tag})`);
      }
    } else {
      metafieldMap.set(key, {
        namespace: mapping.namespace,
        key: mapping.key,
        value: JSON.stringify(mapping.value),
        type: mapping.type,
      });
      if (verbose) {
        console.log(`  → Setting ${mapping.namespace}.${mapping.key} = "${mapping.value}" (from tag: ${tag})`);
      }
    }
  }

  const metafieldsToUpdate = [];
  let alreadyCorrectCount = 0;

  for (const [key, metafield] of metafieldMap) {
    const existingValue = existingMetafields.get(key);

    if (existingValue && metafieldValuesMatch(existingValue, metafield.value)) {
      if (verbose) {
        console.log(`  ✓ Skipping ${key} - already has correct value`);
      }
      alreadyCorrectCount++;
    } else {
      metafieldsToUpdate.push(metafield);
    }
  }

  return {
    hasMappings,
    metafieldsToUpdate,
    alreadyCorrectCount,
  };
}

function isCategoryRetryCandidate(product, constraints) {
  if (isCreatedWithin24Hours(product.createdAt)) {
    return false;
  }

  if (!isCreatedWithinDays(product.createdAt, CATEGORY_RETRY_DAYS)) {
    return false;
  }

  if (!hasMetafieldMappingTags(product)) {
    return false;
  }

  const plan = buildMetafieldUpdatePlan(product);
  if (!plan.hasMappings || plan.metafieldsToUpdate.length === 0) {
    return false;
  }

  const requiredFieldKeys = plan.metafieldsToUpdate.map((field) => `${field.namespace}.${field.key}`);
  const categoryInfo = getCategoryRecommendation(product, requiredFieldKeys, constraints);
  return !categoryInfo.blockedByCategory;
}

function getProductsToProcess(products, constraints) {
  const selected = [];
  const seen = new Set();

  const recentProducts = products.filter((product) => isCreatedWithin24Hours(product.createdAt));
  for (const product of recentProducts) {
    seen.add(product.id);
    selected.push({ product, reason: 'new' });
  }

  const retryProducts = products.filter(
    (product) => !seen.has(product.id) && isCategoryRetryCandidate(product, constraints)
  );

  for (const product of retryProducts) {
    selected.push({ product, reason: 'category-retry' });
  }

  return {
    selected,
    recentCount: recentProducts.length,
    retryCount: retryProducts.length,
  };
}

// Helper function to make GraphQL requests
async function graphqlRequest(query, variables = {}) {
  const response = await fetch(`https://${SHOP_URL}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    
    // Check for specific permission errors
    const accessDeniedError = result.errors.find(err => 
      err.extensions && err.extensions.code === 'ACCESS_DENIED'
    );
    
    if (accessDeniedError) {
      console.error('\n❌ PERMISSION ERROR: Your app needs more permissions!');
      console.error('   Go to: Shopify Admin → Apps → Develop apps → Your App → Configuration');
      console.error('   Enable these scopes: read_products, write_products, read_product_listings, write_product_listings');
      console.error('   Then click "Save" and "Install app" to update permissions\n');
    }
    
    throw new Error('GraphQL request failed');
  }
  return result.data;
}

// Get all products with pagination
async function getAllProducts() {
  let products = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const data = await graphqlRequest(GET_PRODUCTS_QUERY, {
      first: 50,
      after: cursor
    });

    const edges = data.products.edges;
    products.push(...edges.map(edge => edge.node));

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;

    console.log(`Fetched ${products.length} products so far...`);
  }

  return products;
}

// Helper function to check if metafield value matches
function metafieldValuesMatch(existingValue, newValue) {
  try {
    const existing = JSON.stringify(JSON.parse(existingValue).sort());
    const newVal = JSON.stringify(JSON.parse(newValue).sort());
    return existing === newVal;
  } catch (e) {
    return existingValue === newValue;
  }
}

// Update product metafields based on tags
async function updateProductMetafields(product, constraints, dryRun = false) {
  const plan = buildMetafieldUpdatePlan(product, { verbose: true });
  const { metafieldsToUpdate, alreadyCorrectCount } = plan;

  if (metafieldsToUpdate.length > 0) {
    const requiredFieldKeys = metafieldsToUpdate.map((field) => `${field.namespace}.${field.key}`);
    const categoryInfo = getCategoryRecommendation(product, requiredFieldKeys, constraints);

    if (categoryInfo.blockedByCategory) {
      console.warn(`  ⏭️  Skipping metafield update - Product category ${categoryInfo.status}`);
      console.warn(`      Current:   ${categoryInfo.currentCategory}`);
      console.warn(`      Suggested: ${categoryInfo.suggestedCategory}`);
      return { updated: false, skippedCategory: true };
    }

    if (dryRun) {
      console.log(`  🔍 Would update ${metafieldsToUpdate.length} metafield(s) on ${product.handle} (DRY RUN)`);
      return { updated: true, skippedCategory: false, dryRun: true };
    }

    try {
      const result = await graphqlRequest(UPDATE_PRODUCT_METAFIELDS_MUTATION, {
        input: {
          id: product.id,
          metafields: metafieldsToUpdate,
        },
      });

      if (result.productUpdate.userErrors.length > 0) {
        console.error(`  ❌ Errors updating ${product.handle}:`, result.productUpdate.userErrors);
        return { updated: false, skippedCategory: false, failed: true };
      }

      console.log(`  ✅ Updated ${metafieldsToUpdate.length} metafield(s) on ${product.handle}`);
      return { updated: true, skippedCategory: false };
    } catch (error) {
      console.error(`  ❌ Failed to update ${product.handle}:`, error.message);
      return { updated: false, skippedCategory: false, failed: true };
    }
  }

  if (alreadyCorrectCount > 0) {
    console.log(`  ℹ️  All ${alreadyCorrectCount} metafield(s) already correct for ${product.handle}`);
  }

  return { updated: false, skippedCategory: false };
}

// Main function
async function main(dryRun = false) {
  const mode = dryRun ? 'DRY RUN' : 'LIVE UPDATE';
  console.log(`🚀 Starting bulk metafield update from tags... (${mode})\n`);
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No actual updates will be made\n');
  }

  try {
    const constraints = await loadMetafieldCategoryConstraints();

    // Get all products
    console.log('📦 Fetching all products...');
    const products = await getAllProducts();
    console.log(`📦 Found ${products.length} products total`);

    const { selected, recentCount, retryCount } = getProductsToProcess(products, constraints);
    console.log(`📅 ${recentCount} product(s) created within last 24 hours`);
    console.log(`🔁 ${retryCount} product(s) eligible for ${CATEGORY_RETRY_DAYS}-day category retry\n`);

    if (selected.length === 0) {
      console.log('⚠️  No products to process.\n');
      return;
    }

    let processedCount = 0;
    let updatedCount = 0;
    let skippedCategoryCount = 0;
    let failedCount = 0;
    let retryUpdatedCount = 0;

    for (const entry of selected) {
      processedCount++;
      const { product, reason } = entry;
      const reasonLabel = reason === 'category-retry' ? 'category retry' : 'new product';
      console.log(`[${processedCount}/${selected.length}] Processing (${reasonLabel}): ${product.handle} (created: ${product.createdAt})`);

      const result = await updateProductMetafields(product, constraints, dryRun);
      if (result.updated) {
        updatedCount++;
        if (reason === 'category-retry') {
          retryUpdatedCount++;
        }
      }
      if (result.skippedCategory) {
        skippedCategoryCount++;
      }
      if (result.failed) {
        failedCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Completed! Updated ${updatedCount} out of ${processedCount} products (from ${products.length} total products in store).`);
    if (retryUpdatedCount > 0) {
      console.log(`🔁 Category retry updates: ${retryUpdatedCount}`);
    }
    if (skippedCategoryCount > 0) {
      console.log(`⏭️  Skipped ${skippedCategoryCount} product(s) due to missing/wrong Product category.`);
      console.log(`   Will retry automatically for up to ${CATEGORY_RETRY_DAYS} days after product creation once category is fixed.`);
    }
    if (failedCount > 0) {
      console.log(`❌ Failed ${failedCount} product(s). Check logs above.`);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  main(dryRun);
}

module.exports = {
  main,
  TAG_METAFIELD_MAPPINGS,
  CATEGORY_RETRY_DAYS,
  getProductsToProcess,
  isCategoryRetryCandidate,
  buildMetafieldUpdatePlan,
  hasMetafieldMappingTags,
  getAllProducts,
  updateProductMetafields,
};
