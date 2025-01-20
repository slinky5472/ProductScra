interface ProductSelectors {
    [website: string]: {
      container: string;
      title: string;
      price: string;
      description?: string;
    }
  }
  
  class ProductDetector {
    private selectors: ProductSelectors = {
      amazon: {
        container: '#dp-container',
        title: '#productTitle',
        price: '.a-price .a-offscreen',
        description: '#productDescription'
      },
      bestbuy: {
        container: '.shop-product-page',
        title: '.heading-5.v-fw-regular',
        price: '.priceView-customer-price span'
      },
      // Add more websites as needed
    };
  
    public detectProduct(): void {
      const hostname = window.location.hostname;
      console.log('Checking for product on:', hostname);
  
      // Check if we're on a known product site
      const site = this.identifySite(hostname);
      if (!site) {
        console.log('Not a known product site');
        return;
      }
  
      // Try to detect product information
      const productInfo = this.extractProductInfo(site);
      if (productInfo) {
        console.log('Product detected:', productInfo);
        this.notifyExtension(productInfo);
        this.injectProductBadge(productInfo);
      }
    }
  
    private identifySite(hostname: string): string | null {
      if (hostname.includes('amazon')) return 'amazon';
      if (hostname.includes('bestbuy')) return 'bestbuy';
      return null;
    }
  
    private extractProductInfo(site: string): any | null {
      const siteSelectors = this.selectors[site];
      
      // Check if we're on a product page
      const container = document.querySelector(siteSelectors.container);
      if (!container) {
        console.log('No product container found');
        return null;
      }
  
      // Extract product information
      const title = document.querySelector(siteSelectors.title)?.textContent?.trim();
      const priceElement = document.querySelector(siteSelectors.price);
      const price = priceElement?.textContent?.trim();
      const description = siteSelectors.description ? 
        document.querySelector(siteSelectors.description)?.textContent?.trim() : '';
  
      if (!title || !price) {
        console.log('Missing required product information');
        return null;
      }
  
      return {
        title,
        price,
        description,
        url: window.location.href,
        site
      };
    }
  
    private notifyExtension(productInfo: any): void {
      // Send message to background script
      chrome.runtime.sendMessage({
        type: 'PRODUCT_DETECTED',
        payload: productInfo
      });
    }
  
    private injectProductBadge(productInfo: any): void {
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        z-index: 10000;
        font-family: system-ui;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
  
      badge.innerHTML = `
        <div style="font-weight: bold; color: #0369a1;">Product Detected!</div>
        <div style="font-size: 12px; margin-top: 4px; color: #0c4a6e;">
          ${productInfo.title.substring(0, 50)}...
        </div>
      `;
  
      document.body.appendChild(badge);
    }
  }
  
  // Initialize and run detector when page loads
  const detector = new ProductDetector();
  
  // Run on page load
  detector.detectProduct();
  
  // Also run on URL changes (for single-page apps)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      detector.detectProduct();
    }
  }).observe(document, { subtree: true, childList: true });