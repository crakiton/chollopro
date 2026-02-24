import os
import json
import asyncio
import logging
from datetime import datetime
from dotenv import load_dotenv
from google import genai
from supabase import create_client, Client
from telegram import Bot

from wallapy import WallaPyClient as Wallapy

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("chollo-scraper")

load_dotenv()

# --- Config Initialization ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials")

if not SUPABASE_URL.startswith("https://"):
    raise ValueError(f"Invalid SUPABASE_URL: '{SUPABASE_URL}'. It must start with 'https://'.")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    raise

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Error initializing Gemini: {e}")
        client = None
else:
    client = None

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")
if TELEGRAM_BOT_TOKEN:
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
else:
    bot = None


def get_config():
    """Fetch configuration from Supabase, fallback to Env Variables."""
    try:
        response = supabase.table("config").select("*").limit(1).execute()
        if response.data and len(response.data) > 0:
            logger.info("Loaded configuration from Supabase")
            return response.data[0]
    except Exception as e:
        logger.warning(f"Failed to fetch config from Supabase: {e}")

    logger.info("Falling back to environment variables for config")
    return {
        "keyword": os.getenv("SEARCH_KEYWORD", "iphone 13"),
        "category": os.getenv("SEARCH_CATEGORY", "technology"),
        "min_price": float(os.getenv("MIN_PRICE") or 0),
        "max_price": float(os.getenv("MAX_PRICE") or 300),
        "location_mode": os.getenv("LOCATION_MODE", "shipping"),
        "city": os.getenv("CITY", "Madrid"),
        "radius_km": int(os.getenv("RADIUS_KM") or 50),
        "min_score": int(os.getenv("MIN_SCORE") or 7)
    }


def score_deal(title, price, description):
    """Use Gemini to score the deal from 1 to 10."""
    if not client:
        return 0, "Gemini no configurado"
    
    prompt = f"""You are a resell expert. Analyze this Wallapop listing and score its 
resell potential from 1-10. 
Title: {title}. 
Price: {price}€. 
Description: {description}. 
Return only a JSON: {{"score": X, "reason": "brief reason in Spanish"}}"""

    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash-8b', # Map Flash-Lite to standard API model name
            contents=prompt,
        )
        text = response.text.strip()
        # Clean up in case markdown json block is returned
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        data = json.loads(text)
        return int(data.get("score", 0)), data.get("reason", "Sin razón provista")
    except Exception as e:
        logger.error(f"Error scoring deal with Gemini: {e}")
        return 0, "Error al evaluar con IA"


async def send_telegram_alert(deal):
    """Send alert to Telegram channel."""
    if not bot or not TELEGRAM_CHANNEL_ID:
        return
    
    score = deal['score']
    has_shipping = deal['has_shipping']
    shipping_str = "🚚 Con envío" if has_shipping else ""

    message = f"""🔥 CHOLLO {score}/10
📦 {deal['title']}
💰 {deal['price']}€
📍 {deal['location']} {shipping_str}
🤖 {deal['reason']}
🔗 {deal['url']}"""

    try:
        await bot.send_message(chat_id=TELEGRAM_CHANNEL_ID, text=message)
        logger.info(f"Telegram alert sent for: {deal['title']}")
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")


async def main():
    config = get_config()
    keyword = config.get("keyword")
    if not keyword:
        keyword = "iphone"
        logger.warning("Search keyword was empty. Defaulting to 'iphone'.")
    
    logger.info(f"Starting Wallapop scrape for '{keyword}'")

    wp = Wallapy()

    # Prepare search parameters
    search_params = {
        "keywords": keyword,
        "min_price": config.get("min_price"),
        "max_price": config.get("max_price"),
    }
    
    if config.get("location_mode") == "shipping":
        search_params["shipping"] = True
    # If category or location filtering is explicitly supported by wallapy, they'd be added here.
    
    try:
        # Assuming wp.search() returns a list of items or an object with items
        results = await wp.search(**search_params) if asyncio.iscoroutinefunction(wp.search) else wp.search(**search_params)
        
        # Depending on wallapy's return type, adapt to a list of dicts:
        # Some versions return objects, just keeping it generic
        items = results if isinstance(results, list) else getattr(results, 'items', [])
        
        if not items:
            logger.info("No items found.")
            return

        for item in items:
            # Extract fields safely assuming dict or object
            # Adjust these depending on wallapy's exact item structure
            item_url = item.get('url') if isinstance(item, dict) else getattr(item, 'url', '')
            if not item_url:
                continue
                
            item_id = item.get('id') if isinstance(item, dict) else getattr(item, 'id', '')
            title = item.get('title') if isinstance(item, dict) else getattr(item, 'title', 'Sin título')
            price = item.get('price') if isinstance(item, dict) else getattr(item, 'price', 0)
            description = item.get('description') if isinstance(item, dict) else getattr(item, 'description', '')
            
            # Avoid duplicate check
            resp = supabase.table("deals").select("id").eq("url", item_url).limit(1).execute()
            if resp.data and len(resp.data) > 0:
                continue # Already processed
            
            logger.info(f"New listing found: {title} - {price}€")
            
            # Score deal
            score, reason = score_deal(title, price, description)
            logger.info(f"Gemini Score: {score}/10 - {reason}")
            
            min_score = config.get("min_score", 7)
            if score >= min_score:
                photo_url = ''
                images = item.get('images', []) if isinstance(item, dict) else getattr(item, 'images', [])
                if images and len(images) > 0:
                    photo_url = images[0].get('original') if isinstance(images[0], dict) else getattr(images[0], 'original', '')
                
                location_obj = item.get('location', {}) if isinstance(item, dict) else getattr(item, 'location', {})
                location = location_obj.get('city', '') if isinstance(location_obj, dict) else getattr(location_obj, 'city', 'Desconocida')
                
                shipping_info = item.get('shipping', {}) if isinstance(item, dict) else getattr(item, 'shipping', {})
                has_shipping = shipping_info.get('userAllowsShipping', False) if isinstance(shipping_info, dict) else getattr(shipping_info, 'userAllowsShipping', False)
                
                deal_data = {
                    "title": title,
                    "price": price,
                    "url": item_url,
                    "photo_url": photo_url,
                    "score": score,
                    "reason": reason,
                    "location": location,
                    "has_shipping": has_shipping
                }
                
                # Save to supabase
                supabase.table("deals").insert(deal_data).execute()
                logger.info(f"Deal saved to Supabase: {title}")
                
                # Send alert
                await send_telegram_alert(deal_data)
                
    except Exception as e:
        logger.error(f"Error during scraping process: {e}")

if __name__ == "__main__":
    asyncio.run(main())
