// Chatbot Filtering - Test Examples
// File: backend/test-assistant-filters.js
//
// Run with: node test-assistant-filters.js
// This demonstrates the fixed filter behavior

const testQueries = [
  // ====== PRICE FILTERS ======
  {
    query: "cotton bedsheets above 3000",
    expectedFilters: {
      fabricType: "Cotton",
      bedsheetRequest: true,
      minPrice: 3000,
      maxPrice: undefined
    },
    description: "Fabric + Price (minimum)"
  },
  {
    query: "silk bedsheets under 2000",
    expectedFilters: {
      fabricType: "Silk",
      bedsheetRequest: true,
      minPrice: undefined,
      maxPrice: 2000
    },
    description: "Fabric + Price (maximum)"
  },
  {
    query: "linen sheets between 1500 and 4000",
    expectedFilters: {
      fabricType: "Linen",
      bedsheetRequest: true,
      minPrice: 1500,
      maxPrice: 4000
    },
    description: "Fabric + Price (range)"
  },

  // ====== PRICE VARIATIONS ======
  {
    query: "cotton above Rs. 3000",
    expectedFilters: {
      fabricType: "Cotton",
      minPrice: 3000,
      maxPrice: undefined
    },
    description: "Price with 'Rs.' notation"
  },
  {
    query: "bedsheets above ₹3000",
    expectedFilters: {
      bedsheetRequest: true,
      minPrice: 3000,
      maxPrice: undefined
    },
    description: "Price with rupee sign ₹"
  },
  {
    query: "cotton above 3000 rupees",
    expectedFilters: {
      fabricType: "Cotton",
      minPrice: 3000,
      maxPrice: undefined
    },
    description: "Price with 'rupees' text"
  },
  {
    query: "show me polyester sheets less than 1500",
    expectedFilters: {
      fabricType: "Polyester",
      bedsheetRequest: true,
      minPrice: undefined,
      maxPrice: 1500
    },
    description: "Price with 'less than'"
  },
  {
    query: "wool sheets more than 2000",
    expectedFilters: {
      fabricType: "Wool",
      bedsheetRequest: true,
      minPrice: 2000,
      maxPrice: undefined
    },
    description: "Price with 'more than'"
  },

  // ====== COLOR FILTERS ======
  {
    query: "light colored cotton bedsheets above 2000",
    expectedFilters: {
      fabricType: "Cotton",
      bedsheetRequest: true,
      lightColorOnly: true,
      minPrice: 2000,
      maxPrice: undefined
    },
    description: "Fabric + Color + Price"
  },
  {
    query: "dark silk sheets under 3000",
    expectedFilters: {
      fabricType: "Silk",
      bedsheetRequest: true,
      darkColorOnly: true,
      minPrice: undefined,
      maxPrice: 3000
    },
    description: "Fabric + Dark color + Price"
  },

  // ====== COMPLEX QUERIES ======
  {
    query: "show me white cotton bedsheets between 2000 and 5000",
    expectedFilters: {
      fabricType: "Cotton",
      bedsheetRequest: true,
      lightColorOnly: true,
      minPrice: 2000,
      maxPrice: 5000
    },
    description: "Multiple filters: fabric, color, price range"
  },
  {
    query: "I want cotton sheets, light colored, above 2500 Rs",
    expectedFilters: {
      fabricType: "Cotton",
      bedsheetRequest: true,
      lightColorOnly: true,
      minPrice: 2500,
      maxPrice: undefined
    },
    description: "Natural language with multiple criteria"
  },

  // ====== EDGE CASES ======
  {
    query: "bedsheets above 3000",
    expectedFilters: {
      fabricType: undefined,
      bedsheetRequest: true,
      minPrice: 3000,
      maxPrice: undefined
    },
    description: "Price filter without fabric (fallback should work)"
  },
  {
    query: "cotton sheets",
    expectedFilters: {
      fabricType: "Cotton",
      bedsheetRequest: true,
      minPrice: undefined,
      maxPrice: undefined
    },
    description: "Fabric only, no price (no filter applied)"
  },
  {
    query: "under 1000",
    expectedFilters: {
      fabricType: undefined,
      bedsheetRequest: false,
      minPrice: undefined,
      maxPrice: 1000
    },
    description: "Price only (broad search)"
  }
];

// ====== MOCK FILTER EXTRACTION ======
function parseTestQuery(message) {
  const normalize = (text = '') => text.toString().toLowerCase().trim();
  const text = normalize(message);

  // Price parsing
  const underMatch = text.match(/under\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i) 
    || text.match(/below\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/less than\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i);
  const aboveMatch = text.match(/above\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/over\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/more than\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i);
  const betweenMatch = text.match(/between\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i);

  let minPrice, maxPrice;
  if (betweenMatch) {
    minPrice = Number(betweenMatch[1]);
    maxPrice = Number(betweenMatch[2]);
  }
  if (underMatch) {
    maxPrice = Number(underMatch[1]);
  }
  if (aboveMatch) {
    minPrice = Number(aboveMatch[1]);
  }

  // Fabric parsing
  const fabrics = ['cotton', 'silk', 'linen', 'polyester', 'wool', 'blend', 'other'];
  const fabricType = fabrics.find(f => text.includes(f))
    ? fabrics.find(f => text.includes(f)).charAt(0).toUpperCase() + fabrics.find(f => text.includes(f)).slice(1)
    : undefined;

  // Bedsheet detection
  const bedsheetRequest = /bedsheet|bedsheets|bed sheet|bed sheets/.test(text);

  // Color detection
  const lightColorOnly = /(light\s+(?:colour|color)|white\s+bed|pastel|soft shades|ivory|beige|cream)/.test(text);
  const darkColorOnly = /(dark\s+(?:colour|color)|black\s+bed|navy\s+bed|deep shades)/.test(text);

  return {
    fabricType,
    bedsheetRequest,
    minPrice,
    maxPrice,
    lightColorOnly,
    darkColorOnly
  };
}

// ====== TEST RUNNER ======
function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('CHATBOT FILTER EXTRACTION TESTS');
  console.log('='.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;

  testQueries.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.description}`);
    console.log(`Query: "${test.query}"`);

    const result = parseTestQuery(test.query);
    console.log(`Expected: ${JSON.stringify(test.expectedFilters)}`);
    console.log(`Result:   ${JSON.stringify(result)}`);

    // Check if all expected filters match
    let testPassed = true;
    Object.keys(test.expectedFilters).forEach(key => {
      if (result[key] !== test.expectedFilters[key]) {
        testPassed = false;
        console.log(`  ❌ Mismatch: ${key} - expected ${test.expectedFilters[key]}, got ${result[key]}`);
      }
    });

    if (testPassed) {
      console.log('  ✅ PASS');
      passed++;
    } else {
      console.log('  ❌ FAIL');
      failed++;
    }

    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${testQueries.length} tests`);
  console.log('='.repeat(80) + '\n');

  if (failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`❌ ${failed} test(s) failed`);
  }
}

// Run tests
runTests();

// ====== EXAMPLE API RESPONSES ======
/*

Example 1: "cotton bedsheets above 3000"
--------------------------------------
Request:
{
  "message": "cotton bedsheets above 3000"
}

Extracted Filters:
{
  fabricType: "Cotton",
  bedsheetRequest: true,
  minPrice: 3000,
  maxPrice: undefined,
  minRating: undefined,
  lightColorOnly: false,
  darkColorOnly: false
}

MongoDB Query Built:
{
  isActive: true,
  fabricType: "Cotton",
  price: { $gte: 3000 },
  $and: [{
    $or: [
      { category: ObjectId("...") },
      { name: /bedsheet|bed sheet/i },
      { description: /bedsheet|bed sheet/i }
    ]
  }]
}

Response:
{
  "success": true,
  "intent": "product_search",
  "reply": "I found 8 products matching your search.",
  "filters": {
    "fabricType": "Cotton",
    "minPrice": 3000,
    "bedsheetRequest": true
  },
  "products": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Pure Cotton Bedsheet Set - Premium",
      "price": 3499,
      "discountPrice": 2999,
      "fabricType": "Cotton",
      "rating": 4.5
    },
    // ... more products
  ]
}

---

Example 2: "silk sheets under 2000"
-----------------------------------
Request:
{
  "message": "silk sheets under 2000"
}

Extracted Filters:
{
  fabricType: "Silk",
  bedsheetRequest: true,
  minPrice: undefined,
  maxPrice: 2000
}

MongoDB Query Built:
{
  isActive: true,
  fabricType: "Silk",
  price: { $lte: 2000 },
  name: /bedsheet|bed sheet/i
}

Response:
{
  "success": true,
  "reply": "I found 3 products matching your search.",
  "products": [
    {
      "name": "Silk Blend Bedsheet",
      "price": 1899,
      "fabricType": "Silk"
    }
  ]
}

---

Example 3: Fallback: "cotton bedsheets above 10000" (no exact match)
-------------------------------------------------------------------
First query tries:
{
  isActive: true,
  fabricType: "Cotton",
  price: { $gte: 10000 },
  name: /bedsheet|bed sheet/i
}
Result: 0 products

Fallback query (preserves filters):
{
  isActive: true,
  fabricType: "Cotton",  // ✅ Preserved!
  price: { $gte: 10000 },  // ✅ Preserved!
  name: /bedsheet|bed sheet/i
}

Response:
{
  "success": true,
  "reply": "I could not find exact matches with those filters. Try relaxing price/rating filters.",
  "products": []
}

*/
