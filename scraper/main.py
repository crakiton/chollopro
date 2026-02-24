import os
import json
import asyncio
import logging
import time
from dotenv import load_dotenv
from google import genai
from supabase import create_client, Client
from telegram import Bot
import requests

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("chollo-scraper")

load_dotenv()

# --- Supabase Initialization ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials: SUPABASE_URL and SUPABASE_KEY must be set.")

if not SUPABASE_URL.startswith("https://"):
    raise ValueError(f"Invalid SUPABASE_URL: '{SUPABASE_URL}'. It must start with 'https://'.")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    raise

# --- Gemini Initialization ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Error initializing Gemini: {e}")
        gemini_client = None
else:
    gemini_client = None

# --- Telegram Initialization ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID")
if TELEGRAM_BOT_TOKEN:
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
else:
    bot = None

# Wallapop API constants
WALLAPOP_SEARCH_URL = "https://api.wallapop.com/api/v3/general/search"
WALLAPOP_ITEM_URL = "https://api.wallapop.com/api/v3/items/{item_id}"
WALLAPOP_HEADERS = {
    "X-DeviceOS": "0",
    "DeviceOS": "0",
    "Accept": "application/json",
    "Accept-Language": "es-ES",
}


def get_config():
    """Fetch configuration from Supabase config table, fallback to Env Variables."""
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


def search_wallapop(config):
    """Call Wallapop search API and return a list of raw item dicts."""
    keyword = config.get("keyword") or "iphone"
    min_price = config.get("min_price", 0)
    max_price = config.get("max_price", 300)
    location_mode = config.get("location_mode", "shipping")
    radius_km = int(config.get("radius_km") or 50)

    params = {
        "keywords": keyword,
        "latitude": 40.4168,
        "longitude": -3.7038,
        "distance": radius_km * 1000,
        "min_sale_price": min_price,
        "max_sale_price": max_price,
        "order_by": "price_low_to_high",
    }

    if location_mode == "shipping":
        params["shipping_allowed"] = True

    logger.info(f"Searching Wallapop for '{keyword}' | mode={location_mode} | price={min_price}-{max_price}€")

    try:
        response = requests.get(WALLAPOP_SEARCH_URL, params=params, headers=WALLAPOP_HEADERS, timeout=15)
    except requests.RequestException as e:
        logger.error(f"Search request failed: {e}")
        return []

    if response.status_code != 200:
        logger.error(f"Search API returned status {response.status_code}: {response.text[:300]}")
        return []

    data = response.json()
    items = data.get("search_objects", [])
    logger.info(f"Found {len(items)} results from Wallapop.")
    return items


def get_item_description(item_id):
    """Fetch the description of a single item from Wallapop's item detail API."""
    url = WALLAPOP_ITEM_URL.format(item_id=item_id)
    try:
        response = requests.get(url, headers=WALLAPOP_HEADERS, timeout=10)
        if response.status_code == 200:
            return response.json().get("description", "Sin descripción")
        else:
            logger.warning(f"Item detail API returned {response.status_code} for item {item_id}")
    except requests.RequestException as e:
        logger.warning(f"Failed to fetch description for item {item_id}: {e}")
    return "Sin descripción"


def score_deal(title, price, description):
    """Use Gemini to score the deal from 1 to 10."""
    if not gemini_client:
        return 0, "Gemini no configurado"

    prompt = f"""You are a resell expert in Spain. Analyze this Wallapop listing and score its resell potential from 1-10.
Title: {title}
Price: {price}€
Description: {description}
Return only valid JSON: {{"score": X, "reason": "brief reason in Spanish"}}"""

    try:
        response = gemini_client.models.generate_content(
            model='gemini-1.5-flash-8b',
            contents=prompt,
        )
        text = response.text.strip()
        # Clean up markdown code block if present
        if text.startswith("```json"):
            text = text[7:].rstrip("```").strip()
        elif text.startswith("```"):
            text = text[3:].rstrip("```").strip()

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
    shipping_str = "🚚 Con envío" if deal['has_shipping'] else ""

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

    # Keyword safety fallback
    keyword = config.get("keyword")
    if not keyword:
        keyword = "iphone"
        logger.warning("Search keyword was empty. Defaulting to 'iphone'.")
        config["keyword"] = keyword

    # --- Step 1: Search Wallapop ---
    items = search_wallapop(config)
    if not items:
        logger.info("No items to process. Exiting.")
        return

    min_score = int(config.get("min_score") or 7)

    for item in items:
        item_id = item.get("id", "")
        title = item.get("title", "Sin título")
        price = item.get("price", 0)
        web_slug = item.get("web_slug", "")
        url = f"https://es.wallapop.com/item/{web_slug}" if web_slug else ""

        if not url:
            logger.warning(f"Item '{title}' has no URL, skipping.")
            continue

        # Extract photo URL
        images = item.get("images", [])
        photo_url = ""
        if images:
            photo_url = images[0].get("urls", {}).get("big", "")

        location = item.get("location", {}).get("city", "N/A")
        has_shipping = item.get("shipping_allowed", False)

        # --- Duplicate check ---
        try:
            resp = supabase.table("deals").select("id").eq("url", url).limit(1).execute()
            if resp.data and len(resp.data) > 0:
                logger.debug(f"Skipping duplicate: {title}")
                continue
        except Exception as e:
            logger.error(f"Error checking duplicate for '{title}': {e}")
            continue

        logger.info(f"New listing: {title} — {price}€")

        # --- Step 2: Fetch item description ---
        time.sleep(0.5)  # Rate limit protection
        description = get_item_description(item_id)

        # --- Step 3: Score with Gemini ---
        score, reason = score_deal(title, price, description)
        logger.info(f"Score {score}/10 — {reason}")

        if score < min_score:
            logger.info(f"Score {score} below threshold {min_score}. Skipping.")
            continue

        deal_data = {
            "title": title,
            "price": price,
            "url": url,
            "photo_url": photo_url,
            "score": score,
            "reason": reason,
            "location": location,
            "has_shipping": has_shipping,
            "description": description,
        }

        # --- Step 4: Save to Supabase ---
        try:
            supabase.table("deals").insert(deal_data).execute()
            logger.info(f"Deal saved: {title}")
        except Exception as e:
            logger.error(f"Failed to save deal '{title}': {e}")
            continue

        # --- Step 4: Send Telegram alert ---
        await send_telegram_alert(deal_data)


if __name__ == "__main__":
    asyncio.run(main())
