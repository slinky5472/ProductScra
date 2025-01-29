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
  url: string;
}

interface GoogleResult {
  title: string;
  url: string;
  snippet: string;
  source: 'Google';
}

interface OpinionsData {
  reddit: RedditPost[];
  google: GoogleResult[];
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

    // Check if we have any results at all
    if ((!opinions.reddit || opinions.reddit.length === 0) && 
        (!opinions.google || opinions.google.length === 0)) {
        opinionsSection.innerHTML = `
            <div style="color: #64748b; text-align: center; padding: 12px;">
                No reviews found for this product.
            </div>
        `;
        badge.appendChild(opinionsSection);
        return;
    }

    // Display Reddit opinions
    if (opinions.reddit && opinions.reddit.length > 0) {
        const redditSection = document.createElement('div');
        redditSection.innerHTML = `
            <h3 style="color: #0369a1; margin-bottom: 8px;">Reddit Discussions</h3>
            ${opinions.reddit.map((post: RedditPost) => `
                <div style="margin-bottom: 12px; font-size: 12px;">
                    <a href="${post.url}" target="_blank" style="font-weight: bold; color: #0369a1; text-decoration: none;">
                        ${post.title}
                    </a>
                    <div style="color: #64748b;">r/${post.subreddit} • ${post.score} points</div>
                </div>
            `).join('')}
        `;
        opinionsSection.appendChild(redditSection);
    }

    // Display Google results
    if (opinions.google && opinions.google.length > 0) {
        const googleSection = document.createElement('div');
        googleSection.innerHTML = `
            <h3 style="color: #0369a1; margin-top: ${opinions.reddit?.length ? '16px' : '0'}; margin-bottom: 8px;">
                Review Articles
            </h3>
            ${opinions.google.map((result: GoogleResult) => `
                <div style="margin-bottom: 12px; font-size: 12px;">
                    <a href="${result.url}" target="_blank" style="font-weight: bold; color: #0369a1; text-decoration: none;">
                        ${result.title}
                    </a>
                    ${result.snippet ? `<div style="color: #64748b; margin-top: 4px;">${result.snippet}</div>` : ''}
                </div>
            `).join('')}
        `;
        opinionsSection.appendChild(googleSection);
    }

    badge.appendChild(opinionsSection);
}


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
  
  if (!result.success) {
      throw new Error(result.error || 'Failed to fetch opinions');
  }
  
  // Ensure the response has the expected structure
  const opinions: OpinionsData = {
      reddit: Array.isArray(result.data?.reddit) ? result.data.reddit : [],
      google: Array.isArray(result.data?.google) ? result.data.google : []
  };
  
  return opinions;
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

    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = 'position: relative; padding-right: 20px;';
    contentContainer.innerHTML = `
        <div style="font-weight: bold; color: #0369a1; margin-bottom: 8px;">Product Detected!</div>
        <div style="font-size: 14px; color: #0c4a6e;">
          <div style="margin-bottom: 4px;"><strong>Title:</strong> ${productInfo.title.substring(0, 50)}...</div>
          <div style="margin-bottom: 4px;"><strong>Price:</strong> ${productInfo.price}</div>
          ${productInfo.rating ? `<div style="margin-bottom: 4px;"><strong>Rating:</strong> ${productInfo.rating}</div>` : ''}
          ${productInfo.reviews ? `<div style="margin-bottom: 4px;"><strong>Reviews:</strong> ${productInfo.reviews}</div>` : ''}
          ${productInfo.availability ? `<div style="margin-bottom: 4px;"><strong>Availability:</strong> ${productInfo.availability}</div>` : ''}
        </div>
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
    closeButton.innerHTML = '×';
    closeButton.title = 'Close';

    closeButton.onmouseover = () => {
      closeButton.style.backgroundColor = '#e2e8f0';
    };
    closeButton.onmouseout = () => {
      closeButton.style.backgroundColor = 'transparent';
    };

    closeButton.onclick = () => {
      badge.remove();
    };

    // Create opinions button
    const opinionsButton = document.createElement('button');
    opinionsButton.style.cssText = `
        margin-top: 12px;
        padding: 8px 16px;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
    `;
    opinionsButton.textContent = 'Load Reviews & Opinions';
    opinionsButton.onclick = async () => {
        opinionsButton.textContent = 'Loading...';
        opinionsButton.disabled = true;

        try {
            const opinions = await this.fetchOpinions(productInfo.title);
            this.displayOpinions(opinions, badge);
            opinionsButton.textContent = 'Load Reviews & Opinions';
            opinionsButton.disabled = false;
        } catch (error) {
            console.error('Error fetching opinions:', error);
            opinionsButton.textContent = 'Error Loading Opinions';
        }
    };

    // Append everything to the badge in the correct order
    badge.appendChild(closeButton);
    badge.appendChild(contentContainer);
    badge.appendChild(opinionsButton);
    
    // Add the badge to the document
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