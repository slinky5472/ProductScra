// Define interfaces for our types
interface ProductInfo {
  title: string;
  price: string;
  description?: string;
  rating?: string;
  reviews?: string;
  availability?: string;
  features: string[];
  url: string;
  site: string;
}

interface Selectors {
  [key: string]: {
    container: string;
    title: string;
    price: string;
    description?: string;
    rating?: string;
    reviews?: string;
    availability?: string;
    features?: string;
  }
}
interface RedditPost {
  title: string;
  subreddit: string;
  score: string;
  source: 'Reddit';
}

interface YouTubeVideo {
  title: string;
  channel: string;
  views: string;
  source: 'YouTube';
}

interface OpinionsData {
  reddit: RedditPost[];
  youtube: YouTubeVideo[];
}

class ProductDetector {
  private selectors: Selectors = {
    amazon: {
      container: '#dp-container',
      title: '#productTitle',
      price: '.a-price .a-offscreen',
      description: '#productDescription',
      rating: '#acrPopover .a-icon-alt',
      reviews: '#acrCustomerReviewText',
      availability: '#availability',
      features: '#feature-bullets'
    },
    bestbuy: {
      container: '.shop-product-page',
      title: '.heading-5.v-fw-regular',
      price: '.priceView-customer-price span',
      rating: '.c-review-average',
      reviews: '.c-review-count',
      availability: '.fulfillment-add-to-cart-button'
    }
  };

  private extractProductInfo(site: string): ProductInfo | null {
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
    
    // Extract additional information
    const rating = document.querySelector(siteSelectors.rating ?? '')?.textContent?.trim();
    const reviews = document.querySelector(siteSelectors.reviews ?? '')?.textContent?.trim();
    const availability = document.querySelector(siteSelectors.availability ?? '')?.textContent?.trim();
    
    // Extract features (Amazon specific)
    let features: string[] = [];
    if (site === 'amazon' && siteSelectors.features) {
      const featuresList = document.querySelector(siteSelectors.features);
      if (featuresList) {
        features = Array.from(featuresList.querySelectorAll('li'))
          .map(li => li.textContent?.trim() ?? '')
          .filter(text => text && !text.includes('hide')); // Filter out UI elements
      }
    }

    if (!title || !price) {
      console.log('Missing required product information');
      return null;
    }

    return {
      title,
      price,
      description: description ?? undefined,
      rating,
      reviews,
      availability,
      features,
      url: window.location.href,
      site
    };
  }

  private identifySite(hostname: string): string | null {
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('bestbuy')) return 'bestbuy';
    return null;
  }
  private displayOpinions(opinions: OpinionsData, badge: HTMLElement): void {
    const opinionsSection = document.createElement('div');
    opinionsSection.style.cssText = `
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #bae6fd;
    `;

    // Display Reddit opinions
    if (opinions.reddit.length > 0) {
        const redditSection = document.createElement('div');
        redditSection.innerHTML = `
            <h3 style="color: #0369a1; margin-bottom: 8px;">Reddit Discussions</h3>
            ${opinions.reddit.map((post: RedditPost) => `
                <div style="margin-bottom: 8px; font-size: 12px;">
                    <div style="font-weight: bold;">${post.title}</div>
                    <div style="color: #64748b;">r/${post.subreddit} • ${post.score} points</div>
                </div>
            `).join('')}
        `;
        opinionsSection.appendChild(redditSection);
    }

    // Display YouTube reviews
    if (opinions.youtube.length > 0) {
        const youtubeSection = document.createElement('div');
        youtubeSection.innerHTML = `
            <h3 style="color: #0369a1; margin-top: 16px; margin-bottom: 8px;">YouTube Reviews</h3>
            ${opinions.youtube.map((video: YouTubeVideo) => `
                <div style="margin-bottom: 8px; font-size: 12px;">
                    <div style="font-weight: bold;">${video.title}</div>
                    <div style="color: #64748b;">${video.channel} • ${video.views}</div>
                </div>
            `).join('')}
        `;
        opinionsSection.appendChild(youtubeSection);
    }

    badge.appendChild(opinionsSection);
}

// Update the fetch response type
private async fetchOpinions(productName: string): Promise<OpinionsData> {
    const response = await fetch('http://localhost:5001/opinions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            product_name: productName
        })
    });

    const result = await response.json();
    if (result.success) {
        return result.data as OpinionsData;
    }
    throw new Error(result.error || 'Failed to fetch opinions');
}

  public detectProduct(): void {
    const hostname = window.location.hostname;
    console.log('Checking for product on:', hostname);

    const site = this.identifySite(hostname);
    if (!site) {
      console.log('Not a known product site');
      return;
    }

    const productInfo = this.extractProductInfo(site);
    if (productInfo) {
      console.log('Product detected:', productInfo);
      this.notifyExtension(productInfo);
      this.injectProductBadge(productInfo);
    }
  }

  private notifyExtension(productInfo: ProductInfo): void {
    chrome.runtime.sendMessage({
      type: 'PRODUCT_DETECTED',
      payload: productInfo
    });
  }

  private injectProductBadge(productInfo: ProductInfo): void {
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      z-index: 10000;
      font-family: system-ui;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      max-width: 300px;
    `;

    // Create close button
    const closeButton = document.createElement('div');
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      cursor: pointer;
      font-size: 18px;
      color: #64748b;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    `;
    closeButton.innerHTML = '×';  // Using × symbol for the X
    closeButton.title = 'Close';  // Tooltip on hover

    // Add hover effect
    closeButton.onmouseover = () => {
      closeButton.style.backgroundColor = '#e2e8f0';
    };
    closeButton.onmouseout = () => {
      closeButton.style.backgroundColor = 'transparent';
    };

    // Add click handler to remove the badge
    closeButton.onclick = () => {
      badge.remove();
    };

    badge.innerHTML = `
      <div style="position: relative; padding-right: 20px;">
        <div style="font-weight: bold; color: #0369a1; margin-bottom: 8px;">Product Detected!</div>
        <div style="font-size: 14px; color: #0c4a6e;">
          <div style="margin-bottom: 4px;"><strong>Title:</strong> ${productInfo.title.substring(0, 50)}...</div>
          <div style="margin-bottom: 4px;"><strong>Price:</strong> ${productInfo.price}</div>
          ${productInfo.rating ? `<div style="margin-bottom: 4px;"><strong>Rating:</strong> ${productInfo.rating}</div>` : ''}
          ${productInfo.reviews ? `<div style="margin-bottom: 4px;"><strong>Reviews:</strong> ${productInfo.reviews}</div>` : ''}
          ${productInfo.availability ? `<div style="margin-bottom: 4px;"><strong>Availability:</strong> ${productInfo.availability}</div>` : ''}
        </div>
      </div>
    `;

    // Add close button to the badge
    badge.appendChild(closeButton);
    document.body.appendChild(badge);

    
}
}

// Initialize detector
const detector = new ProductDetector();
detector.detectProduct();

// URL change observer for single-page apps
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    detector.detectProduct();
  }
}).observe(document, { subtree: true, childList: true });