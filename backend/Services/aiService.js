const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require('groq-sdk');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const groqClient = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Try models in order — each has its own separate daily quota
const MODELS_BY_PRIORITY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

const tools = [{
  functionDeclarations: [
    {
      name: "search_products",
      description: "Search the store database for products based on keywords, price, or category. Use this to find products the user asks for.",
      parameters: {
        type: "OBJECT",
        properties: {
          keyword: { type: "STRING", description: "Search term like 'curtains', 'bedsheet', 'velvet'" },
          category: { type: "STRING", description: "Category name if known, e.g., 'Curtains', 'Bedsheets', 'Blankets & Quilts'" },
          minPrice: { type: "NUMBER", description: "Minimum price in PKR" },
          maxPrice: { type: "NUMBER", description: "Maximum price in PKR" },
          color: { type: "STRING", description: "e.g., 'light', 'dark', 'white', 'black', 'red'" }
        }
      }
    },
    {
      name: "track_order",
      description: "Look up the status of an order using its order ID.",
      parameters: {
        type: "OBJECT",
        properties: {
          orderId: { type: "STRING", description: "Order ID (e.g., 60d21b4667d0d8992e610c85)" }
        },
        required: ["orderId"]
      }
    },
    {
      name: "get_recommendations",
      description: "Get personalized or trending product recommendations for the user.",
      parameters: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", description: "Type of recommendation, e.g., 'trending' or 'personalized'" }
        }
      }
    }
  ]
}];

const SYSTEM_PROMPT = `You are the AI assistant for Wajahat Fabrics (WF Bedding Store) — a premium e-commerce store selling home textiles, bedsheets, and fabrics.
Store Address / Local Office: Plot 23-C, Sector G, LDA Scheme, Lahore, Pakistan.
Contact Support Number: +92 327 6354709.
Store categories: Bedsheets, Blankets & Quilts, Curtains, Sofa Covers, Pillows & Cushions, Comforters.
Store policies: Orders processed in 24 hours; delivery 2-5 business days (major cities) or 4-7 elsewhere. Returns accepted within 7 days of delivery for unused items. Refunds processed in 7-10 business days. Payment methods: Cash on Delivery, Online payments (Credit/Debit Card, Easypaisa, JazzCash).

You are powered by advanced AI and behave just like ChatGPT or Meta AI—highly intelligent, creative, and capable of answering any question from general knowledge and cooking to coding and writing!
- While you are the host of Wajahat Fabrics and should gladly guide users in shopping bedding products or tracking their orders using your tools, you are also happy to chat about absolutely anything they ask.
- Never decline non-store questions. Answer them fully, accurately, and beautifully, maintaining a warm and helpful tone.

CRITICAL INSTRUCTIONS:
- You have tools to search the database. ALWAYS use 'search_products' when a user asks to see products (e.g. "show me curtains", "I want bedsheets under 2000").
- If the user asks for order tracking, use 'track_order'.
- Once you receive the tool results, present the findings naturally in your reply. Mention how many products you found.
- DO NOT invent product names or prices. ONLY discuss products returned by your tools.
- Keep your final text responses relatively concise and very polite.
`;

const executeChatAgent = async ({ messages, dbFunctions }) => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy_key') {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }

  let lastError = null;

  for (const modelName of MODELS_BY_PRIORITY) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        tools: tools,
        systemInstruction: SYSTEM_PROMPT,
      });

      let history = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content || m.text || '' }]
      }));

      if (history.length > 0 && history[0].role === 'model') {
        history.shift();
      }

      const chat = model.startChat({ history });

      let state = {
        productsToRender: [],
        recommendationsToRender: null,
        orderToRender: null,
      };

      const currentMessage = messages[messages.length - 1].content || messages[messages.length - 1].text || '';

      const maxLoops = 3;
      let loopCount = 0;
      let nextInput = [{ text: currentMessage }];

      const sendWithRetry = async (inputPayload) => {
        let attempts = 0;
        while (attempts < 2) {
          try {
            return await chat.sendMessage(inputPayload);
          } catch (err) {
            const isQuota = err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('Too Many Requests');
            if (isQuota && attempts === 0) {
              attempts++;
              await new Promise(r => setTimeout(r, 3000));
            } else {
              throw err;
            }
          }
        }
      };

      while (loopCount < maxLoops) {
        loopCount++;
        const result = await sendWithRetry(nextInput);
        const response = result.response;
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
          const toolResponsesParts = [];
          for (const call of functionCalls) {
            let toolResult = null;
            try {
              if (call.name === 'search_products' && dbFunctions.searchProducts) {
                const res = await dbFunctions.searchProducts(call.args);
                state.productsToRender = res.products;
                toolResult = { success: true, count: res.products.length, items: res.products.map(p => ({ name: p.name, price: p.price, category: p.category?.name })) };
              } else if (call.name === 'track_order' && dbFunctions.trackOrder) {
                const res = await dbFunctions.trackOrder(call.args);
                state.orderToRender = res;
                toolResult = res;
              } else if (call.name === 'get_recommendations' && dbFunctions.getRecommendations) {
                const res = await dbFunctions.getRecommendations(call.args);
                state.recommendationsToRender = res;
                toolResult = { success: true, count: res.trending?.length || 0, trending: res.trending?.map(p => ({ name: p.name, price: p.price })) };
              } else {
                toolResult = { error: `Tool ${call.name} not implemented.` };
              }
            } catch (err) {
              toolResult = { error: err.message };
            }
            toolResponsesParts.push({ functionResponse: { name: call.name, response: toolResult } });
          }
          nextInput = toolResponsesParts;
        } else {
          return {
            reply: response.text(),
            products: state.productsToRender,
            recommendations: state.recommendationsToRender,
            order: state.orderToRender,
            suggestions: ['Show trending products', 'Track my order', 'Show me bedsheets']
          };
        }
      }

      return { reply: "I needed more time to think about that. Please try asking again.", products: state.productsToRender, suggestions: ['Show trending products'] };

    } catch (err) {
      console.warn(`Model ${modelName} failed or returned error:`, err.message);
      lastError = err;
      continue; // try next model
    }
  }

  // All models exhausted
  throw lastError || new Error('All Gemini models failed or are currently unavailable.');
};

/**
 * Groq fallback — uses Llama 3 via Groq's free API.
 * Kicks in when all Gemini models are quota-exhausted.
 */
const executeGroqChat = async ({ messages }) => {
  if (!groqClient) {
    throw new Error('GROQ_API_KEY not configured.');
  }

  const groqMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content || m.text || ''
    }))
  ];

  const completion = await groqClient.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: groqMessages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
};

/**
 * Lightweight simple chat — tries all Gemini models first,
 * then falls back to Groq if all quota is exhausted.
 */
const executeSimpleChat = async ({ messages }) => {
  const currentMessage = messages[messages.length - 1].content || messages[messages.length - 1].text || '';

  let history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content || m.text || '' }]
  }));
  if (history.length > 0 && history[0].role === 'model') history.shift();

  let lastGeminiError = null;

  // 1. Try Gemini models
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy_key') {
    for (const modelName of MODELS_BY_PRIORITY) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage([{ text: currentMessage }]);
        return result.response.text();
      } catch (err) {
        console.warn(`Simple chat: model ${modelName} failed or returned error:`, err.message);
        lastGeminiError = err;
        continue;
      }
    }
  }

  // 2. Gemini quota exhausted — try Groq (free Llama 3)
  if (groqClient) {
    try {
      console.log('All Gemini models exhausted. Switching to Groq Llama 3...');
      return await executeGroqChat({ messages });
    } catch (groqErr) {
      console.warn('Groq also failed:', groqErr.message);
      throw groqErr;
    }
  }

  throw lastGeminiError || new Error('All AI providers are currently unavailable.');
};

module.exports = { executeChatAgent, executeSimpleChat, executeGroqChat };
