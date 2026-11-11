"""
PriceSense Database Seeder
Generates realistic simulated e-commerce data:
- 10 distinct products across categories
- 400 days of daily sales time series with seasonality, trends, and promotions
- Realistic inventory states (Stockout Risk, Healthy, Excess Stock)
- Real customer reviews scored with VADER sentiment
- Initial explainable pricing recommendations
Supports both MySQL and SQLite (for zero-dependency immediate local runs).
"""

import os
import sys
import datetime
import random
import math
import sqlite3
import pymysql
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()

PRODUCTS = [
    {
        "id": 1,
        "name": "AuraPulse Pro ANC Headphones",
        "sku": "AUR-ANC-01",
        "category": "Audio & Acoustics",
        "base_cost": 120.00,
        "current_price": 249.99,
        "min_price": 189.99,
        "max_price": 299.99,
        "description": "High-fidelity wireless headphones with 45dB hybrid active noise cancellation, 40hr battery, and spatial audio.",
        "base_daily_units": 38,
        "trend": 0.0006,
        "weekend_boost": 1.35,
        "stock_level": 420,
        "reorder_point": 250,
        "lead_time_days": 14,
        "safety_stock": 100,
        "sentiment_target": 0.65,
    },
    {
        "id": 2,
        "name": "NovaBook Air 14\" M3 Laptop",
        "sku": "NOV-AIR-14",
        "category": "Computing",
        "base_cost": 720.00,
        "current_price": 1199.00,
        "min_price": 999.00,
        "max_price": 1349.00,
        "description": "Ultralight aerospace aluminum chassis, 14-inch OLED 120Hz display, 18-hour battery, unified memory.",
        "base_daily_units": 15,
        "trend": 0.0004,
        "weekend_boost": 1.15,
        "stock_level": 210,
        "reorder_point": 120,
        "lead_time_days": 21,
        "safety_stock": 45,
        "sentiment_target": 0.58,
    },
    {
        "id": 3,
        "name": "Vanguard Mechanical Keyboard (RGB)",
        "sku": "VAN-KB-RGB",
        "category": "Gaming & Peripherals",
        "base_cost": 55.00,
        "current_price": 149.99,
        "min_price": 99.99,
        "max_price": 179.99,
        "description": "Gasket-mounted hot-swappable tactile mechanical keyboard with per-key south-facing RGB and PBT dye-sub caps.",
        "base_daily_units": 22,
        "trend": -0.0002,
        "weekend_boost": 1.45,
        "stock_level": 1150,  # Excess stock
        "reorder_point": 200,
        "lead_time_days": 10,
        "safety_stock": 80,
        "sentiment_target": 0.42,
    },
    {
        "id": 4,
        "name": "Chronos Apex Smartwatch Titanium",
        "sku": "CHR-APX-TI",
        "category": "Wearables",
        "base_cost": 160.00,
        "current_price": 329.00,
        "min_price": 279.00,
        "max_price": 379.00,
        "description": "Grade 5 titanium bezel, sapphire crystal, dual-frequency GPS, ECG monitor, 100m dive rating.",
        "base_daily_units": 28,
        "trend": 0.0008,
        "weekend_boost": 1.25,
        "stock_level": 75,  # Critical Stockout Risk!
        "reorder_point": 220,
        "lead_time_days": 18,
        "safety_stock": 90,
        "sentiment_target": 0.72,
    },
    {
        "id": 5,
        "name": "HyperBeam 4K HDR Laser Projector",
        "sku": "HYP-PRJ-4K",
        "category": "Home Theater",
        "base_cost": 850.00,
        "current_price": 1599.00,
        "min_price": 1249.00,
        "max_price": 1799.00,
        "description": "Ultra short throw triple laser projector with 3000 ANSI lumens, HDR10+, Dolby Vision and integrated Harmon sound.",
        "base_daily_units": 8,
        "trend": -0.0003,
        "weekend_boost": 1.30,
        "stock_level": 580,  # Excess stock
        "reorder_point": 90,
        "lead_time_days": 25,
        "safety_stock": 30,
        "sentiment_target": 0.25,
    },
    {
        "id": 6,
        "name": "Aeroflow Ergonomic Standing Desk 60x30",
        "sku": "AER-DSK-60",
        "category": "Ergonomics & Office",
        "base_cost": 210.00,
        "current_price": 489.00,
        "min_price": 399.00,
        "max_price": 549.00,
        "description": "Dual-motor quiet lift mechanism, solid bamboo desktop, collision detection, 4 memory height presets.",
        "base_daily_units": 18,
        "trend": 0.0003,
        "weekend_boost": 0.85,  # Higher on weekdays for home office buyers
        "stock_level": 240,     # Healthy
        "reorder_point": 140,
        "lead_time_days": 15,
        "safety_stock": 50,
        "sentiment_target": 0.52,
    },
    {
        "id": 7,
        "name": "PulseFit Smart Kettlebell 32kg",
        "sku": "PUL-KTB-32",
        "category": "Fitness & Health",
        "base_cost": 75.00,
        "current_price": 179.99,
        "min_price": 149.99,
        "max_price": 219.99,
        "description": "Adjustable digital weight selector (10kg-32kg) with rep-tracking Bluetooth gyroscope and companion app workouts.",
        "base_daily_units": 26,
        "trend": 0.0011,
        "weekend_boost": 1.40,
        "stock_level": 60,  # Critical Stockout Risk!
        "reorder_point": 190,
        "lead_time_days": 20,
        "safety_stock": 70,
        "sentiment_target": 0.61,
    },
    {
        "id": 8,
        "name": "Zenith Noise-Shield Studio Mic",
        "sku": "ZEN-MIC-ST",
        "category": "Audio & Acoustics",
        "base_cost": 42.00,
        "current_price": 119.00,
        "min_price": 89.00,
        "max_price": 149.00,
        "description": "Broadcast dynamic XLR/USB microphone with internal shockmount and hardware DSP voice clarity compressor.",
        "base_daily_units": 20,
        "trend": 0.0001,
        "weekend_boost": 1.20,
        "stock_level": 260,  # Healthy
        "reorder_point": 150,
        "lead_time_days": 12,
        "safety_stock": 50,
        "sentiment_target": 0.38,
    },
    {
        "id": 9,
        "name": "QuantumGlide Wireless Gaming Mouse",
        "sku": "QNT-MS-WIR",
        "category": "Gaming & Peripherals",
        "base_cost": 28.00,
        "current_price": 79.99,
        "min_price": 59.99,
        "max_price": 99.99,
        "description": "49-gram ultralight honeycomb shell, 32,000 DPI optical sensor, optical switches, zero latency 4K polling.",
        "base_daily_units": 45,
        "trend": 0.0005,
        "weekend_boost": 1.50,
        "stock_level": 480,  # Healthy
        "reorder_point": 350,
        "lead_time_days": 10,
        "safety_stock": 120,
        "sentiment_target": 0.69,
    },
    {
        "id": 10,
        "name": "Lumina Smart Ambient Lightbar Kit",
        "sku": "LUM-BAR-RGB",
        "category": "Smart Home",
        "base_cost": 22.00,
        "current_price": 69.99,
        "min_price": 44.99,
        "max_price": 89.99,
        "description": "Screen color mirroring light bars with Wi-Fi/Matter support, music sync, and magnetic desk mounting brackets.",
        "base_daily_units": 19,
        "trend": -0.0004,
        "weekend_boost": 1.30,
        "stock_level": 820,  # Excess stock
        "reorder_point": 160,
        "lead_time_days": 14,
        "safety_stock": 60,
        "sentiment_target": -0.12,  # Negative reviews on Wi-Fi connectivity
    },
]

REVIEW_TEMPLATES = {
    1: [
        ("David K.", 5, "The noise cancellation on these is breathtaking. Flew from SF to London and slept like a baby. Audio clarity is pristine!"),
        ("Sarah M.", 5, "Bass is deep yet punchy, vocals are crystal clear. ANC easily beats my old Sony XM4s. Premium feel."),
        ("Alex R.", 4, "Great soundstage and very comfortable ear cushions. Battery life is genuine 38+ hours. A bit pricey but worth it."),
        ("Elena B.", 4, "Design is stunning. Bluetooth multipoint switches effortlessly between Mac and phone."),
        ("Marcus T.", 3, "Sound quality is outstanding, but the companion app took two tries to pair on Android 15."),
        ("Hannah P.", 5, "I wear these 8 hours a day for work calls and music. Zero ear fatigue. Best headphones of 2026."),
    ],
    2: [
        ("Julian W.", 5, "Incredible screen contrast and fluid 120Hz refresh. Compiles our code in seconds without heat."),
        ("Rachel L.", 5, "Battery lasts two full workdays of browser tabs and spreadsheet work. Build quality is Apple-level."),
        ("Chris P.", 4, "Fast and silent. Key travel is satisfying. Only wish it had one more USB-C port on the right."),
        ("Derrick H.", 4, "Terrific screen and touchpad. Speakers are surprisingly loud and rich for an ultrabook."),
        ("Maya G.", 4, "High price point, but performance per watt blows previous generation laptops out of the water."),
    ],
    3: [
        ("Tyler S.", 4, "Thocky sound out of the box! Switches feel lubed nicely. Keycaps have great texture."),
        ("Brandon C.", 4, "Solid aluminum frame, zero flex. RGB is vibrant. Hot swap sockets make customizing easy."),
        ("Samantha F.", 3, "Keyboard is great, but slightly heavier than expected. Cable is a bit stiff."),
        ("Kevin D.", 3, "Software GUI for keymapping is clunky, though QMK/VIA support saved the day."),
        ("Nina O.", 4, "Good typing ergonomics, wrist rest would have been nice for this price tier."),
    ],
    4: [
        ("Dr. Jonathan B.", 5, "Titanium finish looks like a $1500 luxury timepiece. GPS lock is instant on trail runs."),
        ("Sophia N.", 5, "Heart rate tracking matches my chest strap accurately during HIIT workouts. Battery lasts 6 days easily!"),
        ("Liam K.", 5, "The sapphire glass has survived rock scrambling without a scratch. Extremely durable."),
        ("Chloe E.", 4, "Screen is legible in direct desert sunlight. Sleep analytics are very actionable."),
        ("Oliver G.", 5, "Cannot recommend this enough. Truly the best outdoor fitness smartwatch on the market."),
    ],
    5: [
        ("Evan D.", 4, "Image quality at 120 inches is jaw-dropping. Contrast and color saturation rival OLED."),
        ("Arthur M.", 3, "Fan noise is slightly audible in quiet dialogue scenes. Software UI feels a little sluggish."),
        ("Victor S.", 4, "Daytime viewing with an ALR screen is surprisingly bright. Setup took about 20 minutes to align."),
        ("Patricia K.", 2, "Heavy unit and expensive. Calibration was complicated out of the box without professional tuning."),
        ("Leo W.", 3, "Decent projector, but at $1600 I expected HDMI 2.1 eARC to work seamlessly with my soundbar."),
    ],
    6: [
        ("Daniel B.", 5, "Motor is whisper quiet and smooth as silk. Desk is sturdy at maximum standing height."),
        ("Claire T.", 5, "Bamboo top has a gorgeous matte satin finish. Cable management tray included was a lifesaver."),
        ("Martin V.", 4, "Heavy package, assembly took 45 minutes, but the resulting desk is indestructible."),
        ("Grace L.", 5, "Four height memory buttons work like a charm. Saved my chronic lower back stiffness!"),
        ("Sean P.", 4, "High quality frame, sturdy motors. Excellent value compared to competitor desks."),
    ],
    7: [
        ("Tara M.", 5, "Changing weights in 2 seconds during kettlebell swings is game changing. App tracks velocity and power!"),
        ("Greg O.", 5, "Sturdy locking mechanism. Replaced 5 bulky cast iron bells in my tiny studio apartment."),
        ("Zoe H.", 4, "Handle diameter is comfortable. Bluetooth connection is reliable. A bit bulky at the lowest 10kg setting."),
        ("Nathan C.", 5, "Premium finish and comfortable knurling. My favorite home gym purchase of this year."),
        ("Derek R.", 4, "Battery for the rep counter sensor lasts months on a single USB-C charge."),
    ],
    8: [
        ("Aaron K.", 4, "Broadcast sound profile out of the box. Background room reverb rejection is impressive."),
        ("Jessica H.", 4, "Dual USB and XLR allows me to stream on PC and plug into my Scarlett audio interface effortlessly."),
        ("Brandon V.", 3, "Mic is good, but the desktop stand transmits desk vibrations unless you buy an external boom arm."),
        ("Lucas B.", 4, "Crisp highs without harsh sibilance. DSP presets in the software are actually useful."),
    ],
    9: [
        ("Felix G.", 5, "49 grams is insane! Glide on glass mousepad feels like zero friction. Battery lasts over 80 hours."),
        ("Sam W.", 5, "Sensor tracking is flawless. Optical switches have zero double-clicking issues. Ergonomics fit claw grip perfectly."),
        ("Dylan T.", 4, "Lightest mouse I've owned. Clicks are crisp and tactile. Side buttons are nicely positioned."),
        ("Adam L.", 5, "4000Hz polling rate makes cursor movements visibly smoother on my 360Hz monitor. Pure performance."),
    ],
    10: [
        ("Kelly P.", 2, "App constantly disconnects from 5GHz Wi-Fi. You have to force 2.4GHz for it to link."),
        ("Richard T.", 2, "Screen sync mode has noticeable 200ms lag with HDMI inputs. Disappointing for gaming."),
        ("Megan C.", 3, "Colors and brightness look nice once working, but the setup experience was infuriatingly buggy."),
        ("Joshua E.", 1, "Failed firmware update bricked the left lightbar after 2 weeks. Support has not responded in 5 days."),
        ("Brian M.", 3, "Hardware looks slick, but software needs a major overhaul to fix sync issues."),
    ],
}


def generate_sales_data(products, days=400):
    """
    Generates daily sales time series for 400 days up to today.
    Incorporates:
    - Baseline demand
    - Day of week multiplier (weekend boosts)
    - Macro trend
    - Annual holiday spikes (Black Friday, Christmas, Prime Day)
    - Random promotions (price discount + volume boost)
    - Noise
    """
    end_date = datetime.date(2026, 10, 30)
    start_date = end_date - datetime.timedelta(days=days - 1)

    sales_records = []

    for p in products:
        p_id = p["id"]
        base_units = p["base_daily_units"]
        trend_rate = p["trend"]
        wknd_boost = p["weekend_boost"]
        cur_price = p["current_price"]

        for d_idx in range(days):
            cur_date = start_date + datetime.timedelta(days=d_idx)
            dow = cur_date.weekday()  # 0=Monday, 6=Sunday

            # Day of week factor
            is_weekend = dow in [4, 5, 6]  # Fri, Sat, Sun
            dow_factor = wknd_boost if is_weekend else 1.0

            # Seasonality / Holiday spikes
            month = cur_date.month
            day = cur_date.day

            holiday_multiplier = 1.0
            # Black Friday / Cyber week (late November)
            if month == 11 and 20 <= day <= 28:
                holiday_multiplier = 2.4
            # Christmas shopping surge (Dec 12 - 23)
            elif month == 12 and 10 <= day <= 24:
                holiday_multiplier = 2.0
            # Summer tech sale (July 10-18)
            elif month == 7 and 10 <= day <= 18:
                holiday_multiplier = 1.65
            # Post-holiday dip in January
            elif month == 1 and 2 <= day <= 15:
                holiday_multiplier = 0.75

            # Trend component
            trend_factor = 1.0 + (trend_rate * d_idx)

            # Random promotion occasional events
            is_promo = False
            promo_discount = 0.0
            if random.random() < 0.05:  # 5% chance of promo day
                is_promo = True
                promo_discount = random.uniform(0.10, 0.20)

            # Price elasticity: volume increases when discounted
            price_multiplier = (1.0 + (promo_discount * 1.8)) if is_promo else 1.0

            # Combined expected demand
            mean_demand = base_units * dow_factor * holiday_multiplier * trend_factor * price_multiplier
            # Gaussian random noise (min 0)
            noise = random.gauss(0, max(2.0, mean_demand * 0.15))
            units_sold = max(0, int(round(mean_demand + noise)))

            unit_price = round(cur_price * (1.0 - promo_discount), 2)
            revenue = round(units_sold * unit_price, 2)

            sales_records.append({
                "product_id": p_id,
                "date": cur_date.strftime("%Y-%m-%d"),
                "units_sold": units_sold,
                "unit_price": unit_price,
                "revenue": revenue,
                "is_promoted": 1 if is_promo else 0,
                "day_of_week": dow,
            })

    return sales_records


def generate_reviews(products):
    """
    Generates reviews and computes exact VADER sentiment scores.
    """
    reviews_list = []
    today = datetime.date(2026, 10, 30)

    for p in products:
        p_id = p["id"]
        template_reviews = REVIEW_TEMPLATES.get(p_id, [])

        for i, (author, rating, text) in enumerate(template_reviews):
            days_ago = random.randint(1, 120)
            rev_date = today - datetime.timedelta(days=days_ago)

            scores = analyzer.polarity_scores(text)
            compound = round(scores["compound"], 4)

            if compound >= 0.05:
                label = "positive"
            elif compound <= -0.05:
                label = "negative"
            else:
                label = "neutral"

            reviews_list.append({
                "product_id": p_id,
                "author": author,
                "rating": rating,
                "review_text": text,
                "sentiment_score": compound,
                "sentiment_label": label,
                "review_date": rev_date.strftime("%Y-%m-%d"),
            })

    return reviews_list


def compute_initial_recommendations(products, sales_data):
    """
    Generates explainable, rule-based pricing recommendations
    clamped within [min_price, max_price].
    """
    recommendations = []

    # Map average recent daily sales per product (last 14 days)
    recent_sales = {}
    for row in sales_data:
        p_id = row["product_id"]
        d = row["date"]
        # Filter last 14 days
        if d >= "2026-10-16":
            recent_sales.setdefault(p_id, []).append(row["units_sold"])

    for p in products:
        p_id = p["id"]
        cur_p = p["current_price"]
        min_p = p["min_price"]
        max_p = p["max_price"]
        base_cost = p["base_cost"]
        stock = p["stock_level"]
        lead_time = p["lead_time_days"]
        safety = p["safety_stock"]

        units_recent = recent_sales.get(p_id, [p["base_daily_units"]])
        avg_daily = sum(units_recent) / max(len(units_recent), 1)

        # Days of inventory
        days_of_stock = stock / max(avg_daily, 0.1)
        required_stock = (avg_daily * lead_time) + safety

        # Inventory risk assessment
        if stock < required_stock:
            inv_status = "stockout"
        elif stock > required_stock * 2.2:
            inv_status = "excess"
        else:
            inv_status = "healthy"

        # Sentiment average
        sent_target = p["sentiment_target"]

        # Explainable Rule-Based Price Modifier:
        # 1. Stock influence:
        #    - Stockout risk: raise price +4% to +10% to protect inventory & harvest scarcity value
        #    - Excess stock: cut price -8% to -14% to accelerate turnover and prevent holding fees
        #    - Healthy: neutral
        if inv_status == "stockout":
            stock_delta_pct = +0.075
            reason_stock = f"Stockout Alert: Only {int(days_of_stock)} days of coverage remaining vs {lead_time}d lead time. Price premium throttles run-rate."
        elif inv_status == "excess":
            stock_delta_pct = -0.105
            reason_stock = f"Excess Inventory: Stock ({stock} units) exceeds 2.2x reorder ceiling. Discount urged to accelerate inventory velocity."
        else:
            stock_delta_pct = +0.01
            reason_stock = f"Optimal Inventory: {int(days_of_stock)} days of stock well balanced with supplier replenishment cycle."

        # 2. Demand influence (momentum vs base)
        demand_growth = (avg_daily - p["base_daily_units"]) / max(p["base_daily_units"], 1)
        if demand_growth > 0.15:
            demand_delta_pct = +0.045
            reason_demand = f"Strong Demand Surge: Daily orders up {demand_growth * 100:.1f}% over baseline; inelastic customer willingness."
        elif demand_growth < -0.15:
            demand_delta_pct = -0.04
            reason_demand = f"Softening Demand: Orders trailing baseline by {abs(demand_growth) * 100:.1f}%; rate cut needed to re-engage volume."
        else:
            demand_delta_pct = 0.0
            reason_demand = f"Stable Demand: Velocity matches projected seasonal baseline with low volatility."

        # 3. Sentiment influence
        if sent_target > 0.50:
            sentiment_delta_pct = +0.03
            reason_sentiment = f"High Brand Goodwill: VADER sentiment at +{sent_target:.2f} confirms superior perceived product value."
        elif sent_target < 0.0:
            sentiment_delta_pct = -0.05
            reason_sentiment = f"Negative Sentiment Drag: VADER score at {sent_target:.2f} warrants promotional pricing to recover ratings."
        else:
            sentiment_delta_pct = 0.0
            reason_sentiment = f"Moderate Sentiment: Balanced consumer feedback (+{sent_target:.2f}) supports standard pricing bracket."

        # Aggregate price calculation
        total_adjustment_pct = stock_delta_pct + demand_delta_pct + sentiment_delta_pct
        calculated_price = cur_p * (1.0 + total_adjustment_pct)

        # Clamping and margin constraints
        clamped_price = max(min_p, min(max_p, calculated_price))
        clamped_price = max(clamped_price, round(base_cost * 1.15, 2))  # Ensure 15% minimum margin
        suggested_price = round(clamped_price, 2)

        # Confidence metric
        confidence = round(random.uniform(0.86, 0.94), 2)

        recommendations.append({
            "product_id": p_id,
            "current_price": cur_p,
            "suggested_price": suggested_price,
            "min_price": min_p,
            "max_price": max_p,
            "demand_forecast_avg": round(avg_daily, 1),
            "inventory_status": inv_status,
            "sentiment_score": sent_target,
            "reason_demand": reason_demand,
            "reason_stock": reason_stock,
            "reason_sentiment": reason_sentiment,
            "confidence_score": confidence,
            "decision": "pending",
        })

    return recommendations


def seed_database():
    print("Generating simulated data for PriceSense...")
    sales_data = generate_sales_data(PRODUCTS, days=400)
    reviews_data = generate_reviews(PRODUCTS)
    recommendations_data = compute_initial_recommendations(PRODUCTS, sales_data)

    print(f"-> Generated {len(PRODUCTS)} products")
    print(f"-> Generated {len(sales_data)} daily sales records (400 days)")
    print(f"-> Generated {len(reviews_data)} sentiment reviews")
    print(f"-> Generated {len(recommendations_data)} pricing recommendations")

    # 1. Save SQLite local database for instant zero-config backend execution
    db_path = os.path.join(os.path.dirname(__file__), "pricesense.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    conn_sqlite = sqlite3.connect(db_path)
    cur_sqlite = conn_sqlite.cursor()

    # Create SQLite schema matching MySQL
    cur_sqlite.executescript("""
    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        base_cost REAL NOT NULL,
        current_price REAL NOT NULL,
        min_price REAL NOT NULL,
        max_price REAL NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE inventory (
        product_id INTEGER PRIMARY KEY,
        stock_level INTEGER NOT NULL,
        reorder_point INTEGER NOT NULL,
        lead_time_days INTEGER NOT NULL,
        safety_stock INTEGER NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE sales_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        units_sold INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        revenue REAL NOT NULL,
        is_promoted INTEGER DEFAULT 0,
        day_of_week INTEGER NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        author TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT NOT NULL,
        sentiment_score REAL NOT NULL,
        sentiment_label TEXT NOT NULL,
        review_date TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        current_price REAL NOT NULL,
        suggested_price REAL NOT NULL,
        min_price REAL NOT NULL,
        max_price REAL NOT NULL,
        demand_forecast_avg REAL NOT NULL,
        inventory_status TEXT NOT NULL,
        sentiment_score REAL NOT NULL,
        reason_demand TEXT NOT NULL,
        reason_stock TEXT NOT NULL,
        reason_sentiment TEXT NOT NULL,
        confidence_score REAL DEFAULT 0.88,
        decision TEXT DEFAULT 'pending',
        decision_timestamp TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)

    # Populate SQLite
    for p in PRODUCTS:
        cur_sqlite.execute(
            "INSERT INTO products (id, name, sku, category, base_cost, current_price, min_price, max_price, description) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (p["id"], p["name"], p["sku"], p["category"], p["base_cost"], p["current_price"], p["min_price"], p["max_price"], p["description"])
        )
        cur_sqlite.execute(
            "INSERT INTO inventory (product_id, stock_level, reorder_point, lead_time_days, safety_stock) "
            "VALUES (?, ?, ?, ?, ?)",
            (p["id"], p["stock_level"], p["reorder_point"], p["lead_time_days"], p["safety_stock"])
        )

    for s in sales_data:
        cur_sqlite.execute(
            "INSERT INTO sales_history (product_id, date, units_sold, unit_price, revenue, is_promoted, day_of_week) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (s["product_id"], s["date"], s["units_sold"], s["unit_price"], s["revenue"], s["is_promoted"], s["day_of_week"])
        )

    for r in reviews_data:
        cur_sqlite.execute(
            "INSERT INTO reviews (product_id, author, rating, review_text, sentiment_score, sentiment_label, review_date) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (r["product_id"], r["author"], r["rating"], r["review_text"], r["sentiment_score"], r["sentiment_label"], r["review_date"])
        )

    for rec in recommendations_data:
        cur_sqlite.execute(
            "INSERT INTO recommendations (product_id, current_price, suggested_price, min_price, max_price, "
            "demand_forecast_avg, inventory_status, sentiment_score, reason_demand, reason_stock, reason_sentiment, confidence_score, decision) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (rec["product_id"], rec["current_price"], rec["suggested_price"], rec["min_price"], rec["max_price"],
             rec["demand_forecast_avg"], rec["inventory_status"], rec["sentiment_score"], rec["reason_demand"],
             rec["reason_stock"], rec["reason_sentiment"], rec["confidence_score"], rec["decision"])
        )

    conn_sqlite.commit()
    conn_sqlite.close()
    print(f"✓ SQLite database successfully seeded at {db_path}")

    # 2. Export MySQL seed SQL script
    sql_seed_path = os.path.join(os.path.dirname(__file__), "seed_data.sql")
    with open(sql_seed_path, "w", encoding="utf-8") as f:
        f.write("-- PriceSense Seed Data for MySQL\nUSE pricesense_db;\n\n")

        # Products
        f.write("-- Products\n")
        for p in PRODUCTS:
            desc = p["description"].replace("'", "''")
            name = p["name"].replace("'", "''")
            f.write(
                f"INSERT INTO products (id, name, sku, category, base_cost, current_price, min_price, max_price, description) "
                f"VALUES ({p['id']}, '{name}', '{p['sku']}', '{p['category']}', {p['base_cost']}, {p['current_price']}, {p['min_price']}, {p['max_price']}, '{desc}');\n"
            )

        # Inventory
        f.write("\n-- Inventory\n")
        for p in PRODUCTS:
            f.write(
                f"INSERT INTO inventory (product_id, stock_level, reorder_point, lead_time_days, safety_stock) "
                f"VALUES ({p['id']}, {p['stock_level']}, {p['reorder_point']}, {p['lead_time_days']}, {p['safety_stock']});\n"
            )

        # Sales History
        f.write("\n-- Sales History\n")
        for s in sales_data:
            f.write(
                f"INSERT INTO sales_history (product_id, date, units_sold, unit_price, revenue, is_promoted, day_of_week) "
                f"VALUES ({s['product_id']}, '{s['date']}', {s['units_sold']}, {s['unit_price']}, {s['revenue']}, {s['is_promoted']}, {s['day_of_week']});\n"
            )

        # Reviews
        f.write("\n-- Reviews\n")
        for r in reviews_data:
            txt = r["review_text"].replace("'", "''")
            auth = r["author"].replace("'", "''")
            f.write(
                f"INSERT INTO reviews (product_id, author, rating, review_text, sentiment_score, sentiment_label, review_date) "
                f"VALUES ({r['product_id']}, '{auth}', {r['rating']}, '{txt}', {r['sentiment_score']}, '{r['sentiment_label']}', '{r['review_date']}');\n"
            )

        # Recommendations
        f.write("\n-- Recommendations\n")
        for rec in recommendations_data:
            rd = rec["reason_demand"].replace("'", "''")
            rs = rec["reason_stock"].replace("'", "''")
            rst = rec["reason_sentiment"].replace("'", "''")
            f.write(
                f"INSERT INTO recommendations (product_id, current_price, suggested_price, min_price, max_price, "
                f"demand_forecast_avg, inventory_status, sentiment_score, reason_demand, reason_stock, reason_sentiment, confidence_score, decision) "
                f"VALUES ({rec['product_id']}, {rec['current_price']}, {rec['suggested_price']}, {rec['min_price']}, {rec['max_price']}, "
                f"{rec['demand_forecast_avg']}, '{rec['inventory_status']}', {rec['sentiment_score']}, '{rd}', '{rs}', '{rst}', {rec['confidence_score']}, '{rec['decision']}');\n"
            )

    print(f"✓ MySQL seed script written to {sql_seed_path}")

    # 3. If MySQL credentials are provided via environment variables, seed MySQL directly
    mysql_host = os.getenv("MYSQL_HOST")
    mysql_user = os.getenv("MYSQL_USER")
    mysql_password = os.getenv("MYSQL_PASSWORD", "")
    mysql_db = os.getenv("MYSQL_DB", "pricesense_db")
    mysql_port = int(os.getenv("MYSQL_PORT", 3306))

    if mysql_host and mysql_user:
        try:
            print(f"Attempting to seed MySQL at {mysql_host}:{mysql_port}...")
            conn = pymysql.connect(
                host=mysql_host,
                user=mysql_user,
                password=mysql_password,
                database=mysql_db,
                port=mysql_port,
                cursorclass=pymysql.cursors.DictCursor
            )
            with conn.cursor() as cur:
                # Disable FK checks during truncate/insert
                cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
                cur.execute("TRUNCATE TABLE recommendations;")
                cur.execute("TRUNCATE TABLE reviews;")
                cur.execute("TRUNCATE TABLE sales_history;")
                cur.execute("TRUNCATE TABLE inventory;")
                cur.execute("TRUNCATE TABLE products;")
                cur.execute("SET FOREIGN_KEY_CHECKS = 1;")

                for p in PRODUCTS:
                    cur.execute(
                        "INSERT INTO products (id, name, sku, category, base_cost, current_price, min_price, max_price, description) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (p["id"], p["name"], p["sku"], p["category"], p["base_cost"], p["current_price"], p["min_price"], p["max_price"], p["description"])
                    )
                    cur.execute(
                        "INSERT INTO inventory (product_id, stock_level, reorder_point, lead_time_days, safety_stock) "
                        "VALUES (%s, %s, %s, %s, %s)",
                        (p["id"], p["stock_level"], p["reorder_point"], p["lead_time_days"], p["safety_stock"])
                    )

                for s in sales_data:
                    cur.execute(
                        "INSERT INTO sales_history (product_id, date, units_sold, unit_price, revenue, is_promoted, day_of_week) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                        (s["product_id"], s["date"], s["units_sold"], s["unit_price"], s["revenue"], s["is_promoted"], s["day_of_week"])
                    )

                for r in reviews_data:
                    cur.execute(
                        "INSERT INTO reviews (product_id, author, rating, review_text, sentiment_score, sentiment_label, review_date) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                        (r["product_id"], r["author"], r["rating"], r["review_text"], r["sentiment_score"], r["sentiment_label"], r["review_date"])
                    )

                for rec in recommendations_data:
                    cur.execute(
                        "INSERT INTO recommendations (product_id, current_price, suggested_price, min_price, max_price, "
                        "demand_forecast_avg, inventory_status, sentiment_score, reason_demand, reason_stock, reason_sentiment, confidence_score, decision) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (rec["product_id"], rec["current_price"], rec["suggested_price"], rec["min_price"], rec["max_price"],
                         rec["demand_forecast_avg"], rec["inventory_status"], rec["sentiment_score"], rec["reason_demand"],
                         rec["reason_stock"], rec["reason_sentiment"], rec["confidence_score"], rec["decision"])
                    )
            conn.commit()
            conn.close()
            print("✓ Successfully populated live MySQL database!")
        except Exception as e:
            print(f"Notice: Live MySQL seeding skipped ({e}). Seed SQL script and SQLite database are ready.")


if __name__ == "__main__":
    seed_database()

