// Chatbot Message Rendering Fix - React Implementation Guide
// File: frontend/src/components/ChatAssistant.js

/**
 * MESSAGE BUBBLE COMPONENT
 * Renders individual chat messages with proper text wrapping
 */

const MessageBubble = ({ message, onPromptClick }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div style={{ 
      ...styles.message, 
      ...(isAssistant ? styles.assistantMsg : styles.userMsg) 
    }}>
      {/* ✅ KEY FIX: All text wrapping properties on <p> element */}
      <p style={{ 
        margin: 0, 
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',      // ✅ Preserves line breaks from API
        overflowWrap: 'break-word',  // ✅ Wraps words at container edge
        wordWrap: 'break-word'       // ✅ Legacy fallback
      }}>
        {message.text}
      </p>

      {/* Other content (products, timeline, suggestions) */}
      {message.order?.timeline?.length > 0 && (
        <div style={styles.timelineWrap}>
          {message.order.timeline.map((step) => (
            <div key={step.step} style={styles.timelineStep}>
              <span style={{ ...styles.timelineDot, ...(step.completed ? styles.timelineDone : {}) }} />
              <span style={{ color: step.current ? '#0e7a6d' : '#6e6257', fontWeight: step.current ? 700 : 500 }}>
                {step.step}
              </span>
            </div>
          ))}
        </div>
      )}

      {message.suggestions?.length > 0 && (
        <div style={styles.suggestionWrap}>
          {message.suggestions.slice(0, 4).map((s) => (
            <button 
              key={s} 
              type="button" 
              style={styles.suggestChip} 
              onClick={() => onPromptClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * STYLES OBJECT
 * Contains all CSS properties for proper text wrapping
 */

const styles = {
  // ✅ MESSAGE CONTAINER STYLES
  message: {
    padding: '10px 12px',
    borderRadius: '12px',
    marginBottom: '10px',
    fontSize: '13px',
    overflowWrap: 'break-word',   // ✅ Breaks long words
    wordWrap: 'break-word',       // ✅ Fallback
    whiteSpace: 'normal',         // ✅ Normalized whitespace
    width: '100%',                // ✅ Full container width
    boxSizing: 'border-box',      // ✅ Padding included in width
    minWidth: 0                   // ✅ Flex constraint
  },

  // ✅ ASSISTANT MESSAGE STYLING
  assistantMsg: {
    backgroundColor: '#fff',
    border: '1px solid #eadfce',
    color: '#2c231d'
  },

  // ✅ USER MESSAGE STYLING
  userMsg: {
    backgroundColor: '#d8efe9',
    border: '1px solid #b8ded5',
    color: '#18443f',
    marginLeft: '26px'
  },

  // ✅ CHAT BODY - Container for messages
  body: {
    padding: '12px',
    overflowY: 'auto',
    overflowX: 'hidden',          // ✅ Prevents horizontal scroll
    backgroundColor: '#faf6ef',
    minWidth: 0,
    display: 'flex',              // ✅ Flex layout
    flexDirection: 'column'       // ✅ Vertical stacking
  },

  // Other styles...
  suggestionWrap: { 
    display: 'flex', 
    gap: '6px', 
    flexWrap: 'wrap', 
    marginTop: '8px' 
  },
  suggestChip: {
    border: '1px solid #c9b8a6',
    backgroundColor: '#fff',
    borderRadius: '999px',
    fontSize: '11px',
    padding: '4px 8px',
    cursor: 'pointer'
  }
};

/**
 * USAGE IN COMPONENT
 * How messages are added from API responses
 */

const sendMessage = async (messageText) => {
  try {
    const payload = {
      message: messageText,
      sessionId,
      cartItems,
      // ... other data
    };

    const res = await assistantChat(payload);
    const data = res.data;

    // ✅ API response with line breaks
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: data.reply,  // Includes \n for line breaks
        products: data.products,
        recommendations: data.recommendations,
        suggestions: data.suggestions
      }
    ]);
  } catch (error) {
    setMessages((prev) => [...prev, { 
      role: 'assistant', 
      text: error.response?.data?.error || 'Assistant is temporarily unavailable.' 
    }]);
  }
};

/**
 * EXAMPLE API RESPONSE
 * Notice the \n characters for line breaks
 */

const exampleApiResponse = {
  reply: `Here are the top cotton bedsheets:

1. Egyptian Cotton Set - Rs. 2,499
   - 300 thread count
   - Machine washable
   - Available in King size

2. Percale Cotton Set - Rs. 1,899
   - 200 thread count
   - Ultra soft
   - Available in Twin & Queen

3. Sateen Cotton Set - Rs. 3,299
   - 400 thread count
   - Luxury finish
   - All sizes available

All items are in stock and eligible for free delivery!`,
  suggestions: [
    "Add to cart",
    "Show me more options",
    "What's the return policy?"
  ]
};

/**
 * RENDERED OUTPUT
 * ✅ Text wraps properly
 * ✅ Line breaks preserved
 * ✅ No horizontal overflow
 */

/*
Here are the top cotton bedsheets:

1. Egyptian Cotton Set - Rs. 2,499
   - 300 thread count
   - Machine washable
   - Available in King size

2. Percale Cotton Set - Rs. 1,899
   - 200 thread count
   - Ultra soft
   - Available in Twin & Queen

3. Sateen Cotton Set - Rs. 3,299
   - 400 thread count
   - Luxury finish
   - All sizes available

All items are in stock and eligible for free delivery!
*/

/**
 * TAILWIND ALTERNATIVE
 * If your project uses Tailwind CSS
 */

const TailwindMessageBubble = ({ message, onPromptClick }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`
      p-3 rounded-lg my-2.5 text-sm break-words w-full box-content
      ${isAssistant 
        ? 'bg-white border border-yellow-100 text-gray-900' 
        : 'bg-teal-100 border border-teal-200 text-teal-900 ml-6'
      }
    `}>
      <p className="m-0 leading-normal whitespace-pre-wrap break-words">
        {message.text}
      </p>
    </div>
  );
};

/**
 * TAILWIND CLASSES USED
 * - break-words: overflowWrap: break-word
 * - whitespace-pre-wrap: Preserves line breaks
 * - w-full: width: 100%
 * - box-content: box-sizing: content-box
 */

export default MessageBubble;
