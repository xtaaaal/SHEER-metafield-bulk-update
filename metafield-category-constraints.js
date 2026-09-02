const fetch = require('node-fetch');
require('dotenv').config();

const SHOP_URL = process.env.SHOP_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const RELEVANT_FIELD_KEYS = new Set([
  'support_level',
  'padding_level',
  'wiring',
  'rise',
  'coverage',
  'fit',
  'underwear_features',
  'bra-features',
  'bra-coverage',
]);

const GET_METAFIELD_DEFINITIONS_QUERY = `
  query getMetafieldDefinitions($first: Int!, $ownerType: MetafieldOwnerType!) {
    metafieldDefinitions(first: $first, ownerType: $ownerType) {
      edges {
        node {
          namespace
          key
          name
          constraints {
            key
            values(first: 100) {
              nodes {
                value
              }
            }
          }
        }
      }
    }
  }
`;

const GET_TAXONOMY_CATEGORY_QUERY = `
  query getTaxonomyCategory($id: ID!) {
    node(id: $id) {
      ... on TaxonomyCategory {
        id
        fullName
        isLeaf
      }
    }
  }
`;

const SUBTYPE_HINTS = [
  { pattern: /\bthong\b|und-thong/i, match: /\bthongs?\b/i },
  { pattern: /\bbrief\b|\bknicker\b|\bshorty\b|und-brief/i, match: /\bbriefs?\b/i },
  { pattern: /\bboyshort\b|und-boyshort/i, match: /\bboyshorts?\b/i },
  { pattern: /\bv-string\b|\bv string\b|\bg-string\b/i, match: /\bg-strings?\b/i },
  { pattern: /\bbikini\b/i, match: /\bbikinis?\b/i },
  { pattern: /\bbodysuit\b|\bbasque\b|\bbustier\b|\bcorset\b/i, match: /\bbodysuits?\b|\bcorsets\b|\bbustiers\b/i },
  { pattern: /\bsports?\s*bra\b/i, match: /\bsports bras\b/i },
  { pattern: /\bbra\b|bra-/i, match: />\s*bras$/i },
];

let constraintsCache = null;
let categoryCache = new Map();

function normalizeCategoryId(id) {
  if (!id) {
    return null;
  }

  return id.replace('gid://shopify/TaxonomyCategory/', '');
}

async function graphqlRequest(query, variables = {}) {
  const response = await fetch(`https://${SHOP_URL}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

async function resolveCategory(shortId) {
  if (categoryCache.has(shortId)) {
    return categoryCache.get(shortId);
  }

  const data = await graphqlRequest(GET_TAXONOMY_CATEGORY_QUERY, {
    id: `gid://shopify/TaxonomyCategory/${shortId}`,
  });

  const node = data.node;
  const category = node
    ? {
        id: node.id,
        shortId,
        fullName: node.fullName,
        isLeaf: node.isLeaf,
      }
    : {
        id: `gid://shopify/TaxonomyCategory/${shortId}`,
        shortId,
        fullName: `(unknown category: ${shortId})`,
        isLeaf: true,
      };

  categoryCache.set(shortId, category);
  return category;
}

async function loadMetafieldCategoryConstraints(options = {}) {
  if (constraintsCache && !options.forceReload) {
    return constraintsCache;
  }

  if (!SHOP_URL || !ACCESS_TOKEN) {
    throw new Error('SHOP_URL and ACCESS_TOKEN must be set in .env');
  }

  process.stderr.write('Loading metafield category constraints from Shopify...\n');

  const data = await graphqlRequest(GET_METAFIELD_DEFINITIONS_QUERY, {
    first: 100,
    ownerType: 'PRODUCT',
  });

  const fieldConstraints = new Map();
  const allShortIds = new Set();

  for (const edge of data.metafieldDefinitions.edges) {
    const node = edge.node;
    const fieldKey = `${node.namespace}.${node.key}`;

    if (!RELEVANT_FIELD_KEYS.has(node.key)) {
      continue;
    }

    const shortIds = (node.constraints?.values?.nodes || []).map((item) => item.value);
    fieldConstraints.set(fieldKey, shortIds);
    shortIds.forEach((id) => allShortIds.add(id));
  }

  process.stderr.write(`Resolving ${allShortIds.size} taxonomy categories...\n`);

  const categoriesByShortId = new Map();
  for (const shortId of allShortIds) {
    categoriesByShortId.set(shortId, await resolveCategory(shortId));
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  constraintsCache = { fieldConstraints, categoriesByShortId };
  return constraintsCache;
}

function getAllowedCategoriesForFields(fieldKeys, constraints) {
  if (fieldKeys.length === 0) {
    return [];
  }

  const { fieldConstraints, categoriesByShortId } = constraints;
  let allowedShortIds = null;

  for (const fieldKey of fieldKeys) {
    const fieldShortIds = fieldConstraints.get(fieldKey);
    if (!fieldShortIds || fieldShortIds.length === 0) {
      continue;
    }

    const fieldSet = new Set(fieldShortIds);
    allowedShortIds = allowedShortIds === null
      ? fieldSet
      : new Set([...allowedShortIds].filter((id) => fieldSet.has(id)));
  }

  if (!allowedShortIds || allowedShortIds.size === 0) {
    return [];
  }

  return [...allowedShortIds]
    .map((shortId) => categoriesByShortId.get(shortId))
    .filter(Boolean)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function isCategoryAllowedForFields(categoryId, fieldKeys, constraints) {
  if (!categoryId) {
    return false;
  }

  const allowed = getAllowedCategoriesForFields(fieldKeys, constraints);
  const shortId = normalizeCategoryId(categoryId);
  return allowed.some((category) => category.shortId === shortId);
}

function pickSuggestedCategory(product, allowedCategories) {
  if (!allowedCategories.length) {
    return null;
  }

  const leaves = allowedCategories.filter((category) => category.isLeaf);
  const pool = leaves.length ? leaves : allowedCategories;
  const haystack = `${product.handle} ${product.title} ${product.tags.join(' ')}`;

  for (const hint of SUBTYPE_HINTS) {
    if (hint.pattern.test(haystack)) {
      const match = pool.find((category) => hint.match.test(category.fullName));
      if (match) {
        return match;
      }
    }
  }

  return pool.sort(
    (a, b) => a.fullName.length - b.fullName.length || a.fullName.localeCompare(b.fullName)
  )[0];
}

function getCategoryRecommendation(product, requiredFieldKeys, constraints) {
  const allowedCategories = getAllowedCategoriesForFields(requiredFieldKeys, constraints);
  const currentCategory = product.category?.fullName || '';
  const currentCategoryId = product.category?.id || null;
  const suggested = pickSuggestedCategory(product, allowedCategories);
  const isAllowed = isCategoryAllowedForFields(currentCategoryId, requiredFieldKeys, constraints);

  let status = 'ok';
  if (!currentCategoryId) {
    status = 'missing';
  } else if (!isAllowed) {
    status = 'wrong';
  }

  return {
    status,
    currentCategory: currentCategory || '(blank)',
    currentCategoryId,
    suggestedCategory: suggested?.fullName || '(no allowed category found for these metafields)',
    suggestedCategoryId: suggested?.id || null,
    allowedCategories: allowedCategories.map((category) => category.fullName).join(' | '),
    allowedCategoryCount: allowedCategories.length,
    isAllowed,
    blockedByCategory: status !== 'ok',
  };
}

module.exports = {
  loadMetafieldCategoryConstraints,
  getAllowedCategoriesForFields,
  isCategoryAllowedForFields,
  pickSuggestedCategory,
  getCategoryRecommendation,
  normalizeCategoryId,
};
