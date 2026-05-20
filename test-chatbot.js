const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const testMessages = [
  'Show me All light colour Bedsheets',
  'Show me light colored bedsheets',
  'I want light bedsheets',
  'Recommend products for me',
  'Show me trending products'
];

const testAssistantChat = async (message) => {
  try {
    console.log(`\n📨 Testing: "${message}"`);
    const response = await axios.post(`${BASE_URL}/assistant/chat`, {
      message,
      sessionId: 'test-session-' + Date.now(),
      cartItems: [],
      recentlyViewed: [],
      lastCartActivityAt: null
    });

    const data = response.data;
    console.log('✅ Response:', {
      intent: data.intent,
      reply: data.reply,
      filters: data.filters,
      productCount: data.products ? data.products.length : 0,
      products: data.products ? data.products.map(p => ({ name: p.name, shade: p.shadeCategories })) : []
    });
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

const runTests = async () => {
  console.log('🧪 Starting chatbot API tests...\n');
  for (const message of testMessages) {
    await testAssistantChat(message);
  }
  console.log('\n✨ Tests completed!');
};

runTests();
