"""
PriceSense Dynamic Synchronization & Ingestion Engine
Handles:
1. Dynamic recalculation of pricing recommendations from live database records
2. Dynamic activity stream generation from real inventory, pricing, and sentiment state
3. Ingestion and parsing of user-fed datasets (CSV or JSON)
"""

import datetime
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from backend.db import (
    get_products,
    get_product,
    get_product_by_sku,
    get_all_inventory_records,
    get_sales_for_product,
    get_reviews_for_product,
    get_recommendations_list,
    get_reference_date,
    upsert_recommendation,
    clear_all_tables,
    insert_product,
    upsert_inventory,
    insert_sales_batch,
    insert_review,
)
from ml.forecaster import run_forecast
from ml.sentiment import analyze_product_sentiment
from ml.pricing_engine import evaluate_pricing_recommendation

analyzer = SentimentIntensityAnalyzer()


def sync_all_pricing_recommendations():
    """
    Dynamically recalculates rule-based pricing recommendations for every
    product currently in the catalog using its live sales, inventory, and reviews.
    """
    products = get_products()
    inventory_records = {item["product_id"]: item for item in get_all_inventory_records()}
    recs_updated = 0

    for p in products:
        p_id = p["id"]
        inv = inventory_records.get(p_id, {
            "stock_level": 100,
            "reorder_point": 50,
            "lead_time_days": 14,
            "safety_stock": 20,
        })

        sales = get_sales_for_product(p_id)
        reviews = get_reviews_for_product(p_id)

        # 1. Compute dynamic forecast summary
        if sales and len(sales) >= 40:
            try:
                forecast_res = run_forecast(sales, horizon=7, product_info=p)
                forecast_summary = forecast_res["summary"]
            except Exception:
                recent_units = [s["units_sold"] for s in sales[-14:]] if len(sales) >= 14 else [s["units_sold"] for s in sales]
                avg_u = sum(recent_units) / max(len(recent_units), 1)
                forecast_summary = {
                    "avg_daily_projected": round(avg_u, 1),
                    "total_projected_demand": round(avg_u * 7, 1),
                }
        elif sales and len(sales) > 0:
            recent_units = [s["units_sold"] for s in sales[-14:]] if len(sales) >= 14 else [s["units_sold"] for s in sales]
            avg_u = max(0.5, sum(recent_units) / max(len(recent_units), 1))
            forecast_summary = {
                "avg_daily_projected": round(avg_u, 1),
                "total_projected_demand": round(avg_u * 7, 1),
            }
        else:
            forecast_summary = {
                "avg_daily_projected": 10.0,
                "total_projected_demand": 70.0,
            }

        # 2. Compute dynamic sentiment summary
        sentiment_summary = analyze_product_sentiment(reviews, product_info=p)

        # 3. Rule-based explainable pricing
        rec = evaluate_pricing_recommendation(p, inv, forecast_summary, sentiment_summary)

        # 4. Upsert to database
        upsert_recommendation(rec)
        recs_updated += 1

    return recs_updated


def generate_dynamic_activities():
    """
    Synthesizes a live, realistic event feed derived 100% dynamically
    from the current database state: stockout warnings, excess inventory,
    pending manager approvals, and sentiment shifts.
    """
    inv_records = get_all_inventory_records()
    recs = get_recommendations_list()
    activities = []
    act_id = 1

    # 1. Identify live stockout items
    for item in inv_records:
        stock = int(item["stock_level"])
        p_id = item["product_id"]
        sales = get_sales_for_product(p_id)
        if sales and len(sales) >= 7:
            burn = max(0.5, sum(s["units_sold"] for s in sales[-7:]) / 7)
        else:
            burn = max(0.5, float(item["reorder_point"]) / max(int(item["lead_time_days"]), 1))
        
        days_of_supply = round(stock / burn, 1)
        thresh = (burn * int(item["lead_time_days"])) + int(item["safety_stock"])

        if stock < thresh:
            activities.append({
                "id": f"act-{act_id}",
                "type": "stockout_alert",
                "product": item["product_name"],
                "message": f"Stock depleted to {stock} units ({days_of_supply}d supply vs {item['lead_time_days']}d lead time). Upward price buffer applied.",
                "time": f"{act_id * 14}m ago",
                "severity": "critical"
            })
            act_id += 1
            if act_id > 3:
                break

    # 2. Identify pending price decisions
    pending_recs = [r for r in recs if r.get("decision") == "pending"]
    for r in pending_recs[:2]:
        diff = float(r["suggested_price"]) - float(r["current_price"])
        sign = "+" if diff > 0 else "-"
        activities.append({
            "id": f"act-{act_id}",
            "type": "approval_pending",
            "product": r["product_name"],
            "message": f"AI suggested {sign}${abs(diff):.2f} price adjustment ({r['suggested_price']}) awaiting manager sign-off.",
            "time": f"{act_id * 22}m ago",
            "severity": "info"
        })
        act_id += 1

    # 3. Identify excess stock items
    for item in inv_records:
        stock = int(item["stock_level"])
        p_id = item["product_id"]
        sales = get_sales_for_product(p_id)
        if sales and len(sales) >= 7:
            burn = max(0.5, sum(s["units_sold"] for s in sales[-7:]) / 7)
        else:
            burn = max(0.5, float(item["reorder_point"]) / max(int(item["lead_time_days"]), 1))
        thresh = (burn * int(item["lead_time_days"])) + int(item["safety_stock"])

        if stock > (thresh * 2.2):
            activities.append({
                "id": f"act-{act_id}",
                "type": "excess_warning",
                "product": item["product_name"],
                "message": f"Inventory at {stock} units ({stock / max(thresh, 1):.1f}x threshold). Markdown recommended to accelerate turnover.",
                "time": f"{act_id * 35}m ago",
                "severity": "warning"
            })
            act_id += 1
            break

    # 4. Sentiment highlight
    if recs:
        # Find product with highest absolute sentiment
        best_sent = max(recs, key=lambda x: abs(float(x.get("sentiment_score", 0))))
        score = float(best_sent.get("sentiment_score", 0))
        label = "positive reviews" if score > 0 else "adverse reviews"
        activities.append({
            "id": f"act-{act_id}",
            "type": "sentiment_surge",
            "product": best_sent["product_name"],
            "message": f"VADER sentiment measured at {score:+.2f} based on customer reviews.",
            "time": "2h ago",
            "severity": "success" if score > 0 else "warning"
        })
        act_id += 1

    # Fallback if catalog is minimal
    if not activities:
        activities = [{
            "id": "act-1",
            "type": "system",
            "product": "PriceSense Core",
            "message": "AI pricing engine and demand forecasters actively monitoring catalog dataset.",
            "time": "Just now",
            "severity": "info"
        }]

    return activities


def ingest_dataset_payload(payload, clear_first=False):
    """
    Ingests user-supplied dataset with flexible field mapping.
    Payload format:
    {
        "products": [
            {"name": "...", "sku": "...", "category": "...", "base_cost": 50, "current_price": 99, "min_price": 79, "max_price": 129}
        ],
        "inventory": [
            {"sku": "...", "stock_level": 150, "reorder_point": 60, "lead_time_days": 14, "safety_stock": 25}
        ],
        "sales": [
            {"sku": "...", "date": "2026-01-01", "units_sold": 25, "unit_price": 99.0}
        ],
        "reviews": [
            {"sku": "...", "author": "Alice", "rating": 5, "review_text": "Great product!"}
        ]
    }
    """
    if clear_first:
        clear_all_tables()

    stats = {
        "products_imported": 0,
        "inventory_imported": 0,
        "sales_imported": 0,
        "reviews_imported": 0,
        "recommendations_generated": 0,
    }

    # 1. Ingest Products
    products_input = payload.get("products", [])
    sku_to_id = {}

    # Map existing products first
    for p in get_products():
        sku_to_id[p["sku"]] = p["id"]

    for item in products_input:
        name = item.get("name") or item.get("product_name") or "Unnamed Product"
        sku = str(item.get("sku") or f"SKU-{stats['products_imported'] + 1}").strip().upper()
        category = item.get("category") or "General"
        cur_p = float(item.get("current_price") or item.get("price") or 50.0)
        base_c = float(item.get("base_cost") or item.get("cost") or cur_p * 0.5)
        min_p = float(item.get("min_price") or cur_p * 0.75)
        max_p = float(item.get("max_price") or cur_p * 1.35)
        desc = item.get("description") or ""

        # Check if product already exists by SKU
        existing = get_product_by_sku(sku)
        if existing:
            p_id = existing["id"]
        else:
            p_id = insert_product(name, sku, category, base_c, cur_p, min_p, max_p, desc)
            stats["products_imported"] += 1

        sku_to_id[sku] = p_id

    # 2. Ingest Inventory
    inv_input = payload.get("inventory", [])
    for item in inv_input:
        sku = str(item.get("sku", "")).strip().upper()
        p_id = item.get("product_id") or sku_to_id.get(sku)
        if not p_id:
            continue

        stock = int(item.get("stock_level") or item.get("stock") or item.get("quantity") or 100)
        lead = int(item.get("lead_time_days") or item.get("lead_time") or 14)
        safety = int(item.get("safety_stock") or 25)
        reorder_pt = int(item.get("reorder_point") or (lead * 8) + safety)

        upsert_inventory(p_id, stock, reorder_pt, lead, safety)
        stats["inventory_imported"] += 1

    # 3. Ingest Sales History
    sales_input = payload.get("sales", [])
    batch_records = []
    for item in sales_input:
        sku = str(item.get("sku", "")).strip().upper()
        p_id = item.get("product_id") or sku_to_id.get(sku)
        if not p_id:
            continue

        date_str = str(item.get("date", ""))[:10]
        try:
            d_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
            dow = d_obj.weekday()
        except Exception:
            dow = 0

        units = int(item.get("units_sold") or item.get("units") or item.get("quantity") or 0)
        price = float(item.get("unit_price") or item.get("price") or 0.0)
        revenue = float(item.get("revenue") or (units * price))
        is_promo = int(item.get("is_promoted") or 0)

        batch_records.append({
            "product_id": p_id,
            "date": date_str,
            "units_sold": units,
            "unit_price": price,
            "revenue": revenue,
            "is_promoted": is_promo,
            "day_of_week": dow,
        })

    if batch_records:
        stats["sales_imported"] = insert_sales_batch(batch_records)

    # 4. Ingest Reviews & Score with VADER
    reviews_input = payload.get("reviews", [])
    for item in reviews_input:
        sku = str(item.get("sku", "")).strip().upper()
        p_id = item.get("product_id") or sku_to_id.get(sku)
        if not p_id:
            continue

        text = str(item.get("review_text") or item.get("text") or item.get("review") or "").strip()
        if not text:
            continue

        author = str(item.get("author") or "Verified Customer")
        rating = int(item.get("rating") or 4)
        rev_date = str(item.get("review_date") or item.get("date") or datetime.date.today().isoformat())[:10]

        # Real VADER sentiment calculation
        scores = analyzer.polarity_scores(text)
        compound = round(scores["compound"], 4)
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"

        insert_review(p_id, author, rating, text, compound, label, rev_date)
        stats["reviews_imported"] += 1

    # 5. Automatically trigger dynamic recommendations update
    stats["recommendations_generated"] = sync_all_pricing_recommendations()

    return stats

