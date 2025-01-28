from flask import Flask, request, jsonify
from flask_cors import CORS
from opinion_scraper import OpinionScraper
import threading

app = Flask(__name__)
CORS(app)

# Store scraper instance
scraper = None
scraper_lock = threading.Lock()

def get_scraper():
    global scraper
    with scraper_lock:
        if scraper is None:
            scraper = OpinionScraper()
        return scraper

@app.route('/opinions', methods=['POST'])
def get_opinions():
    try:
        data = request.get_json()
        if not data or 'product_name' not in data:
            return jsonify({'error': 'Product name is required'}), 400

        product_name = data['product_name']
        current_scraper = get_scraper()
        opinions = current_scraper.get_product_opinions(product_name)
        
        return jsonify({
            'success': True,
            'data': opinions
        })

    except Exception as e:
        print(f"Error getting opinions: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(port=5001)  # Use different port from main scraper