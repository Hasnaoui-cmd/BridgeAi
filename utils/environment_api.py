"""
Environment API — Live Weather & Port Congestion data for the Prediction Agent.

Provides real-time environment variables. Weather returns a full dictionary:
    {
      "severity_score": int (1-5),
      "temp_c": float,
      "condition_text": str,
      "wind_kph": float,
      "humidity": int
    }

Port congestion still returns an integer (1-5) severity score.
"""

import os
import random
import requests
from dotenv import load_dotenv

load_dotenv()
WEATHERAPI_KEY = os.getenv("WEATHERAPI_KEY", "")

# ─────────────────────────────────────────────────────────────────────
# Weather condition text → severity mapping
# ─────────────────────────────────────────────────────────────────────

def _text_to_severity(condition_text: str) -> int:
    t = condition_text.lower()
    if any(w in t for w in ['sunny', 'clear', 'partly cloudy']):
        return 1
    elif any(w in t for w in ['cloudy', 'overcast', 'mist', 'fog']):
        return 2
    elif any(w in t for w in ['patchy rain', 'light rain', 'drizzle']):
        return 3
    elif any(w in t for w in ['moderate rain', 'heavy rain', 'snow', 'sleet', 'freezing']):
        return 4
    elif any(w in t for w in ['thunder', 'blizzard', 'hurricane', 'storm', 'tornado']):
        return 5
    return 1


def get_live_weather(city: str, date: str = None) -> dict:
    """
    Fetches current or forecasted weather from WeatherAPI.com.
    Returns a dict with full weather details AND severity_score for the ML model.
    Falls back to a default dict if the API fails.
    """
    default = {
        "severity_score": 1,
        "temp_c": 20.0,
        "condition_text": "Clear",
        "wind_kph": 10.0,
        "humidity": 50,
    }

    if not WEATHERAPI_KEY:
        print(f"⚠️ [Weather] No WEATHERAPI_KEY configured. Defaulting for '{city}' on '{date}'.")
        return default

    # Use forecast API if a date is provided, else current
    if date:
        url = f"http://api.weatherapi.com/v1/forecast.json?key={WEATHERAPI_KEY}&q={city}&dt={date}"
    else:
        url = f"http://api.weatherapi.com/v1/current.json?key={WEATHERAPI_KEY}&q={city}"
        
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if date and "forecast" in data and data["forecast"]["forecastday"]:
                # Forecast response structure
                day_data = data["forecast"]["forecastday"][0]["day"]
                condition_text = day_data["condition"]["text"]
                severity = _text_to_severity(condition_text)
                result = {
                    "severity_score": severity,
                    "temp_c": float(day_data.get("avgtemp_c", 20.0)),
                    "condition_text": condition_text,
                    "wind_kph": float(day_data.get("maxwind_kph", 10.0)),
                    "humidity": int(day_data.get("avghumidity", 50)),
                }
            else:
                # Current response structure
                current = data.get("current", {})
                condition_text = current.get("condition", {}).get("text", "Clear")
                severity = _text_to_severity(condition_text)

                result = {
                    "severity_score": severity,
                    "temp_c": float(current.get("temp_c", 20.0)),
                    "condition_text": condition_text,
                    "wind_kph": float(current.get("wind_kph", 10.0)),
                    "humidity": int(current.get("humidity", 50)),
                }
            print(f"🌤️ [Weather] {city} on {date or 'today'}: {condition_text} | {result['temp_c']}°C | {result['wind_kph']} kph → severity={severity}")
            return result
        else:
            print(f"⚠️ [Weather] API failed for '{city}'. Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return default

    except Exception as e:
        print(f"⚠️ [Weather] Unexpected error for '{city}': {e}. Defaulting.")
        return default


def get_mock_port_congestion(port_name: str, date: str = None) -> int:
    """
    Simulates a port congestion API call.
    Returns a severity score from 1 (Empty) to 5 (Gridlock).
    Weighted distribution: ~40% = 1, ~30% = 2, ~15% = 3, ~10% = 4, ~5% = 5
    """
    weights = [40, 30, 15, 10, 5]
    score = random.choices([1, 2, 3, 4, 5], weights=weights, k=1)[0]
    date_str = f" on {date}" if date else ""
    print(f"🚢 [Congestion] {port_name}{date_str}: congestion_score={score}")
    return score
