const fetch = require('node-fetch');
require('dotenv').config();

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
  'Lounge-relaxed-fit': { namespace: 'custom', key: 'fit', value: ['Relaxed Fit'], type: 'list.single_line_text_field' },
  'Lounge-slim-fit': { namespace: 'custom', key: 'fit', value: ['Slim Fit'], type: 'list.single_line_text_field' },
  'Lounge-body-hugging': { namespace: 'custom', key: 'fit', value: ['Body Hugging'], type: 'list.single_line_text_field' },
  
  
  
};

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
  const productCreatedTime = new Date(createdAt);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return productCreatedTime >= twentyFourHoursAgo;
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
async function updateProductMetafields(product, dryRun = false) {
  let metafields = [];
  let updated = false;
  let skippedCount = 0;

  // Build a map of existing metafields for quick lookup
  const existingMetafields = new Map();
  if (product.metafields && product.metafields.edges) {
    product.metafields.edges.forEach(edge => {
      const key = `${edge.node.namespace}.${edge.node.key}`;
      existingMetafields.set(key, edge.node.value);
    });
  }

  // Build metafields map to consolidate duplicate keys
  const metafieldMap = new Map();
  
  // Check each tag for metafield mappings
  for (const tag of product.tags) {
    if (TAG_METAFIELD_MAPPINGS[tag]) {
      const mapping = TAG_METAFIELD_MAPPINGS[tag];
      const key = `${mapping.namespace}.${mapping.key}`;
      
      // Filter by product type to prevent "Owner subtype" errors
      const isValidForProductType = isMetafieldValidForProductType(mapping, product.productType);
      if (!isValidForProductType) {
        console.log(`  ⏭️  Skipping ${mapping.namespace}.${mapping.key} - not valid for product type "${product.productType}" (from tag: ${tag})`);
        continue;
      }
      
      if (metafieldMap.has(key)) {
        // Merge values for list types (like underwear_features)
        const existing = metafieldMap.get(key);
        const existingValues = JSON.parse(existing.value);
        const newValues = [...new Set([...existingValues, ...mapping.value])]; // Remove duplicates
        existing.value = JSON.stringify(newValues);
        console.log(`  → Merging ${mapping.namespace}.${mapping.key} += "${mapping.value}" (from tag: ${tag})`);
      } else {
        // First occurrence of this metafield
        metafieldMap.set(key, {
          namespace: mapping.namespace,
          key: mapping.key,
          value: JSON.stringify(mapping.value), // Convert array to JSON string for list types
          type: mapping.type
        });
        console.log(`  → Setting ${mapping.namespace}.${mapping.key} = "${mapping.value}" (from tag: ${tag})`);
      }
      updated = true;
    }
  }
  
  // Filter out metafields that already have the correct value
  const metafieldsToUpdate = [];
  for (const [key, metafield] of metafieldMap) {
    const existingValue = existingMetafields.get(key);
    
    if (existingValue && metafieldValuesMatch(existingValue, metafield.value)) {
      console.log(`  ✓ Skipping ${key} - already has correct value`);
      skippedCount++;
    } else {
      metafieldsToUpdate.push(metafield);
    }
  }
  
  metafields = metafieldsToUpdate;

  if (metafields.length > 0) {
    if (dryRun) {
      console.log(`  🔍 Would update ${metafields.length} metafield(s) on ${product.handle} (DRY RUN)`);
    } else {
      try {
        const result = await graphqlRequest(UPDATE_PRODUCT_METAFIELDS_MUTATION, {
          input: {
            id: product.id,
            metafields: metafields
          }
        });

        if (result.productUpdate.userErrors.length > 0) {
          console.error(`  ❌ Errors updating ${product.handle}:`, result.productUpdate.userErrors);
        } else {
          console.log(`  ✅ Updated ${metafields.length} metafield(s) on ${product.handle}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to update ${product.handle}:`, error.message);
      }
    }
    return true;
  } else if (skippedCount > 0) {
    console.log(`  ℹ️  All ${skippedCount} metafield(s) already correct for ${product.handle}`);
    return false;
  }

  return false;
}

// Main function
async function main(dryRun = false) {
  const mode = dryRun ? 'DRY RUN' : 'LIVE UPDATE';
  console.log(`🚀 Starting bulk metafield update from tags... (${mode})\n`);
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No actual updates will be made\n');
  }

  try {
    // Get all products
    console.log('📦 Fetching all products...');
    const products = await getAllProducts();
    console.log(`📦 Found ${products.length} products total`);

    // Filter for products created within last 24 hours
    const recentProducts = products.filter(product => isCreatedWithin24Hours(product.createdAt));
    console.log(`📅 ${recentProducts.length} products created within last 24 hours\n`);

    if (recentProducts.length === 0) {
      console.log('⚠️  No products found that were created within the last 24 hours. Nothing to process.\n');
      return;
    }

    // Process each recent product
    let processedCount = 0;
    let updatedCount = 0;

    for (const product of recentProducts) {
      processedCount++;
      console.log(`[${processedCount}/${recentProducts.length}] Processing: ${product.handle} (created: ${product.createdAt})`);

      const wasUpdated = await updateProductMetafields(product, dryRun);
      if (wasUpdated) {
        updatedCount++;
      }

      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Completed! Updated ${updatedCount} out of ${processedCount} products (from ${products.length} total products in store).`);

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  main(dryRun);
}

module.exports = { main, TAG_METAFIELD_MAPPINGS };
