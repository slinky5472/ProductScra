interface ProductInfo {
    title: string;
    price: string;
    description?: string;
    url: string;
    site: string;
  }
  
  // Store detected products
  let detectedProducts: { [url: string]: ProductInfo } = {};
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PRODUCT_DETECTED') {
      const product = message.payload;
      console.log('Product detected:', product);
      
      // Store the product
      detectedProducts[product.url] = product;
      
      // Update extension badge
      chrome.action.setBadgeText({
        text: '✓',
        tabId: sender.tab?.id
      });
      
      chrome.action.setBadgeBackgroundColor({
        color: '#10B981',
        tabId: sender.tab?.id
      });
    }
  });