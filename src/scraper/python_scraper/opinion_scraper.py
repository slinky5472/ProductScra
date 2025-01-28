from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import re

class OpinionScraper:
    def __init__(self):
        # Set up Chrome options
        self.chrome_options = Options()
        self.chrome_options.add_argument("--headless")  # Run in headless mode
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Initialize the driver
        self.driver = webdriver.Chrome(options=self.chrome_options)
        self.driver.implicitly_wait(10)  # Set implicit wait time

    def clean_product_name(self, product_name):
        # Remove brand names and common words to get better search results
        common_words = ['amazon', 'exclusive', 'brand', 'new', 'the']
        cleaned = ' '.join(word for word in product_name.lower().split() 
                         if word not in common_words)
        return re.sub(r'[^\w\s]', '', cleaned)

    def search_reddit_opinions(self, product_name):
        cleaned_name = self.clean_product_name(product_name)
        search_url = f"https://www.reddit.com/search/?q={cleaned_name}%20review"
        
        try:
            self.driver.get(search_url)
            
            # Wait for posts to load
            posts = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div[data-testid='post-container']"))
            )

            opinions = []
            for post in posts[:5]:  # Get first 5 posts
                try:
                    title = post.find_element(By.CSS_SELECTOR, "h3").text
                    subreddit = post.find_element(By.CSS_SELECTOR, "a[data-click-id='subreddit']").text
                    score = post.find_element(By.CSS_SELECTOR, "div[data-click-id='upvote']").text
                    
                    opinions.append({
                        'title': title,
                        'subreddit': subreddit,
                        'score': score,
                        'source': 'Reddit'
                    })
                except Exception as e:
                    print(f"Error extracting post data: {e}")
                    continue

            return opinions

        except TimeoutException:
            print("Timeout waiting for Reddit posts to load")
            return []
        except Exception as e:
            print(f"Error searching Reddit: {e}")
            return []

    def search_youtube_reviews(self, product_name):
        cleaned_name = self.clean_product_name(product_name)
        search_url = f"https://www.youtube.com/results?search_query={cleaned_name}+review"
        
        try:
            self.driver.get(search_url)
            
            # Wait for videos to load
            videos = WebDriverWait(self.driver, 10).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "ytd-video-renderer"))
            )

            reviews = []
            for video in videos[:3]:  # Get first 3 videos
                try:
                    title = video.find_element(By.CSS_SELECTOR, "#video-title").text
                    channel = video.find_element(By.CSS_SELECTOR, "#channel-name").text
                    views = video.find_element(By.CSS_SELECTOR, "#metadata-line span").text
                    
                    reviews.append({
                        'title': title,
                        'channel': channel,
                        'views': views,
                        'source': 'YouTube'
                    })
                except Exception as e:
                    print(f"Error extracting video data: {e}")
                    continue

            return reviews

        except TimeoutException:
            print("Timeout waiting for YouTube videos to load")
            return []
        except Exception as e:
            print(f"Error searching YouTube: {e}")
            return []

    def get_product_opinions(self, product_name):
        """Main method to get opinions from multiple sources"""
        all_opinions = {
            'reddit': self.search_reddit_opinions(product_name),
            'youtube': self.search_youtube_reviews(product_name)
        }
        return all_opinions

    def close(self):
        """Clean up the driver"""
        if self.driver:
            self.driver.quit()

# Example usage
if __name__ == "__main__":
    scraper = OpinionScraper()
    try:
        product_name = "Sony WH-1000XM4 Headphones"  # Example product
        opinions = scraper.get_product_opinions(product_name)
        print("Reddit Opinions:", opinions['reddit'])
        print("YouTube Reviews:", opinions['youtube'])
    finally:
        scraper.close()