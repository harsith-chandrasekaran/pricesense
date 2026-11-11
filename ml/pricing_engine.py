"""
PriceSense Explainable Rule-Based Pricing Engine
Translates demand forecast, inventory position, unit economics,
and customer sentiment into transparent, actionable price recommendations.
Strictly bounded by configured [min_price, max_price] and cost floor.
"""

def evaluate_pricing_recommendation(product, inventory, forecast_summary, sentiment_summary):
    """
    Computes a transparent, explainable price recommendation.
    
    Parameters:
    - product: dict(id, name, sku, base_cost, current_price, min_price, max_price)
    - inventory: dict(stock_level, reorder_point, lead_time_days, safety_stock)
    - forecast_summary: dict(avg_daily_projected, total_projected_demand)
    - sentiment_summary: dict(overall_score, label)
    """
    cur_price = float(product["current_price"])
    min_price = float(product["min_price"])
    max_price = float(product["max_price"])
    base_cost = float(product["base_cost"])

    stock = int(inventory.get("stock_level", 0))
    lead_time = int(inventory.get("lead_time_days", 14))
    safety_stock = int(inventory.get("safety_stock", 30))
    reorder_point = int(inventory.get("reorder_point", (lead_time * 10) + safety_stock))

    daily_demand = max(0.1, float(forecast_summary.get("avg_daily_projected", 10.0)))
    vader_score = float(sentiment_summary.get("overall_score", 0.0))

    # 1. Inventory & Stockout Analysis
    days_of_supply = round(stock / daily_demand, 1)
    reorder_threshold = (daily_demand * lead_time) + safety_stock

    if stock < reorder_threshold:
        inv_status = "stockout"
        stock_delta = +0.08  # +8% upward buffer
        stock_reason = (
            f"Stockout Warning: At current velocity ({daily_demand:.1f} units/day), "
            f"existing stock ({stock} units) covers only {days_of_supply} days vs {lead_time}d replenishment lead time. "
            f"Price buffer throttles sell-through while preserving margin."
        )
    elif stock > (reorder_threshold * 2.2):
        inv_status = "excess"
        stock_delta = -0.10  # -10% discount
        stock_reason = (
            f"Excess Inventory: Stock ({stock} units) is {stock / max(reorder_threshold, 1):.1f}x "
            f"above safety buffer ({int(reorder_threshold)} units). "
            f"Price discount urged to reduce carrying costs and free warehouse capital."
        )
    else:
        inv_status = "healthy"
        stock_delta = 0.01
        stock_reason = (
            f"Healthy Inventory: {days_of_supply} days of supply adequately balances "
            f"the {lead_time}-day supplier replenishment window."
        )

    # 2. Demand Elasticity Analysis
    # Compare with nominal daily run-rate
    base_units = float(product.get("base_daily_units", daily_demand))
    growth_rate = (daily_demand - base_units) / max(base_units, 1.0)

    if growth_rate > 0.15:
        demand_delta = +0.05
        demand_reason = (
            f"Surging Demand: Forecasted demand (+{growth_rate * 100:.1f}% vs baseline) "
            f"shows strong consumer willingness to purchase at full value."
        )
    elif growth_rate < -0.15:
        demand_delta = -0.05
        demand_reason = (
            f"Lagging Demand: Order velocity trails baseline by {abs(growth_rate) * 100:.1f}%. "
            f"Price discount recommended to stimulate volume."
        )
    else:
        demand_delta = 0.0
        demand_reason = "Stable Demand: Forward forecast tracks seasonal baseline expectations."

    # 3. Sentiment Analysis
    if vader_score >= 0.40:
        sentiment_delta = +0.03
        sentiment_reason = (
            f"Positive Sentiment: VADER score of +{vader_score:.2f} confirms strong customer loyalty "
            f"and high product satisfaction."
        )
    elif vader_score <= -0.05:
        sentiment_delta = -0.04
        sentiment_reason = (
            f"Sentiment Headwind: VADER score of {vader_score:.2f} suggests customer hesitation; "
            f"discount recommended to mitigate adverse review impacts."
        )
    else:
        sentiment_delta = 0.0
        sentiment_reason = f"Neutral Sentiment: Reviews average {vader_score:+.2f}, supporting standard price point."

    # 4. Total Price Formulation
    total_adjustment_pct = stock_delta + demand_delta + sentiment_delta
    raw_suggested = cur_price * (1.0 + total_adjustment_pct)

    # Cost Floor Guardrail (must yield >= 15% gross margin)
    cost_floor = round(base_cost * 1.15, 2)
    raw_suggested = max(raw_suggested, cost_floor)

    # Clamping between min_price and max_price
    clamped_price = max(min_price, min(max_price, raw_suggested))
    suggested_price = round(clamped_price, 2)

    price_diff = round(suggested_price - cur_price, 2)
    pct_change = round(((suggested_price - cur_price) / cur_price) * 100, 2)

    confidence = 0.91 if inv_status == "stockout" else (0.87 if inv_status == "excess" else 0.89)

    return {
        "product_id": product["id"],
        "product_name": product["name"],
        "sku": product["sku"],
        "current_price": cur_price,
        "suggested_price": suggested_price,
        "min_price": min_price,
        "max_price": max_price,
        "base_cost": base_cost,
        "price_diff": price_diff,
        "pct_change": pct_change,
        "demand_forecast_avg": round(daily_demand, 1),
        "inventory_status": inv_status,
        "stock_level": stock,
        "days_of_supply": days_of_supply,
        "sentiment_score": vader_score,
        "reason_demand": demand_reason,
        "reason_stock": stock_reason,
        "reason_sentiment": sentiment_reason,
        "confidence_score": confidence,
        "decision": "pending",
    }

