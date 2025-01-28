// src/background/index.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCRAPE_REQUEST') {
    console.log('Background script received request for URL:', message.url);
    
    // Check if tab ID exists
    if (!sender.tab?.id) {
      console.error('No tab ID found');
      return;
    }

    const tabId = sender.tab.id;  // Store tab ID in a constant
    
    fetch('http://localhost:5000/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: message.url })
    })
    .then(response => {
      console.log('Received response:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Scraped data:', data);
      chrome.tabs.sendMessage(tabId, {
        type: 'SCRAPE_RESPONSE',
        payload: data
      });
    })
    .catch(error => {
      console.error('Fetch error:', error);
      chrome.tabs.sendMessage(tabId, {
        type: 'SCRAPE_ERROR',
        payload: error.message
      });
    });
  }
  return true;  // Will respond asynchronously
});