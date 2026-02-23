import os
import sys

# Set empty strings for numeric env vars
os.environ["MIN_PRICE"] = ""
os.environ["MAX_PRICE"] = ""
os.environ["RADIUS_KM"] = ""
os.environ["MIN_SCORE"] = ""
os.environ["SEARCH_KEYWORD"] = "test"

# Import main to test get_config
from scraper.main import get_config

try:
    config = get_config()
    print("Config parsed successfully!")
    print(f"MIN_PRICE: {config['min_price']} (type: {type(config['min_price'])})")
    print(f"MAX_PRICE: {config['max_price']} (type: {type(config['max_price'])})")
    print(f"RADIUS_KM: {config['radius_km']} (type: {type(config['radius_km'])})")
    print(f"MIN_SCORE: {config['min_score']} (type: {type(config['min_score'])})")
    sys.exit(0)
except Exception as e:
    print(f"Error parsing config: {e}")
    sys.exit(1)
