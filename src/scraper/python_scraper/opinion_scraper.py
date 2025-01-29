import requests
from bs4 import BeautifulSoup
import re
import time
from urllib.parse import quote_plus

class OpinionScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
    def clean_product_name(self, product_name):
        # Extract brand and main product name
        words = product_name.split()
        
        # Keep only first 3-4 significant words
        important_words = []
        skip_words = ['the', 'with', 'and', 'for', 'from', 'by', 'in', 'on', 'at', 
                     'to', 'of', 'new', 'brand', 'exclusive', 'amazon', 'latest',
                     'featuring', 'includes', 'including', 'features']
        
        # Get brand name (usually first word)
        if words:
            brand = words[0]
            important_words.append(brand)
        
        # Add next few significant words
        word_count = 0
        for word in words[1:]:
            if word_count >= 3:  # Limit to 3 additional words after brand
                break
            if (len(word) > 2 and  # Skip very short words
                word.lower() not in skip_words and
                not word.startswith('(') and
                not word.startswith('[')):
                important_words.append(word)
                word_count += 1
        
        # Join words and clean special characters
        cleaned = ' '.join(important_words)
        cleaned = re.sub(r'[^\w\s-]', '', cleaned)  # Remove special chars except hyphens
        
        print(f"Original name: {product_name}")
        print(f"Cleaned name: {cleaned}")
        
        return cleaned

    def search_reddit_opinions(self, product_name):
        cleaned_name = self.clean_product_name(product_name)
        # Use Reddit's JSON API
        search_url = f"https://www.reddit.com/search.json?q={quote_plus(cleaned_name)}+review&sort=relevance&limit=5"
        
        try:
            response = requests.get(search_url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            opinions = []
            for post in data['data']['children'][:5]:
                post_data = post['data']
                opinions.append({
                    'title': post_data['title'],
                    'subreddit': post_data['subreddit'],
                    'score': str(post_data['score']),
                    'source': 'Reddit',
                    'url': f"https://reddit.com{post_data['permalink']}"
                })
                print(f"Found Reddit post: {post_data['title'][:50]}...")
            
            return opinions
            
        except Exception as e:
            print(f"Error searching Reddit: {e}")
            return []

    def search_google_reviews(self, product_name):
        cleaned_name = self.clean_product_name(product_name)
        search_url = f"https://www.google.com/search?q={quote_plus(cleaned_name)}+review"
        
        try:
            response = requests.get(search_url, headers=self.headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            reviews = []
            # Find review results in Google search
            search_results = soup.select('div.g')[:3]  # Get first 3 results
            
            for result in search_results:
                title_elem = result.select_one('h3')
                link_elem = result.select_one('a')
                snippet_elem = result.select_one('div.VwiC3b')
                
                if title_elem and link_elem:
                    reviews.append({
                        'title': title_elem.text,
                        'url': link_elem['href'],
                        'snippet': snippet_elem.text if snippet_elem else '',
                        'source': 'Google'
                    })
                    print(f"Found Google result: {title_elem.text[:50]}...")
            
            return reviews
            
        except Exception as e:
            print(f"Error searching Google: {e}")
            return []

    def get_product_opinions(self, product_name):
        """Main method to get opinions from multiple sources"""
        print(f"Searching opinions for: {product_name}")
        all_opinions = {
            'reddit': self.search_reddit_opinions(product_name),
            'google': self.search_google_reviews(product_name)
        }
        return all_opinions

# Example usage and testing
if __name__ == "__main__":
    scraper = OpinionScraper()
    try:
        # Test with a sample product
        product_name = "Sony WH-1000XM4"
        print(f"\nTesting scraper with product: {product_name}")
        opinions = scraper.get_product_opinions(product_name)
        
        print("\nReddit Results:")
        for post in opinions['reddit']:
            print(f"- {post['title'][:50]}... (r/{post['subreddit']})")
        
        print("\nGoogle Results:")
        for result in opinions['google']:
            print(f"- {result['title'][:50]}...")
            
    except Exception as e:
        print(f"Error in test: {e}")