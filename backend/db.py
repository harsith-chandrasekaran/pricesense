"""
PriceSense Unified Database Connector
Supports MySQL (production / configurable via env) with automatic
SQLite fallback (zero-configuration local execution).
Provides comprehensive dataset ingestion, querying, and dynamic syncing.
"""

import os
import datetime
import sqlite3
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "pricesense.db")


def get_mysql_connection():
    mysql_host = os.getenv("MYSQL_HOST")
    mysql_user = os.getenv("MYSQL_USER")
    mysql_password = os.getenv("MYSQL_PASSWORD", "")
    mysql_db = os.getenv("MYSQL_DB", "pricesense_db")
    mysql_port = int(os.getenv("MYSQL_PORT", 3306))

    if not mysql_host or not mysql_user:
        return None

    try:
        conn = pymysql.connect(
            host=mysql_host,
            user=mysql_user,
            password=mysql_password,
            database=mysql_db,
            port=mysql_port,
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=3
        )
        return conn
    except Exception as e:
        print(f"[PriceSense DB] MySQL connect failed: {e}. Falling back to SQLite.")
        return None


def get_db():
    mysql_conn = get_mysql_connection()
    if mysql_conn is not None:
        return ("mysql", mysql_conn)
    
    # SQLite fallback
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return ("sqlite", conn)


def fetch_all(query, params=None):
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            query_sqlite = query.replace("%s", "?")
            cur.execute(query_sqlite, params or ())
            rows = [dict(row) for row in cur.fetchall()]
        else:
            cur.execute(query, params or ())
            rows = cur.fetchall()
        return rows
    finally:
        conn.close()


def fetch_one(query, params=None):
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            query_sqlite = query.replace("%s", "?")
            cur.execute(query_sqlite, params or ())
            row = cur.fetchone()
            return dict(row) if row else None
        else:
            cur.execute(query, params or ())
            row = cur.fetchone()
            return row
    finally:
        conn.close()


def execute_write(query, params=None):
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            query_sqlite = query.replace("%s", "?")
            cur.execute(query_sqlite, params or ())
        else:
            cur.execute(query, params or ())
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def execute_script(sql_script):
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            cur.executescript(sql_script)
        else:
            # MySQL split statements
            for statement in sql_script.split(";"):
                stmt = statement.strip()
                if stmt:
                    cur.execute(stmt)
        conn.commit()
    finally:
        conn.close()


# Domain query helpers

def get_products():
    return fetch_all("SELECT * FROM products ORDER BY id ASC")


def get_product(product_id):
    return fetch_one("SELECT * FROM products WHERE id = %s", (product_id,))


def get_product_by_sku(sku):
    return fetch_one("SELECT * FROM products WHERE sku = %s", (sku,))


def get_sales_for_product(product_id):
    return fetch_all("SELECT * FROM sales_history WHERE product_id = %s ORDER BY date ASC", (product_id,))


def get_all_inventory_records():
    query = """
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.category,
        p.current_price,
        p.base_cost,
        COALESCE(i.stock_level, 0) as stock_level,
        COALESCE(i.reorder_point, 50) as reorder_point,
        COALESCE(i.lead_time_days, 14) as lead_time_days,
        COALESCE(i.safety_stock, 20) as safety_stock,
        i.last_updated
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    ORDER BY p.id ASC
    """
    return fetch_all(query)


def get_reviews_for_product(product_id):
    return fetch_all("SELECT * FROM reviews WHERE product_id = %s ORDER BY review_date DESC", (product_id,))


def get_all_reviews():
    return fetch_all("SELECT * FROM reviews ORDER BY review_date DESC")


def get_recommendations_list():
    query = """
    SELECT 
        r.id,
        r.product_id,
        p.name as product_name,
        p.sku,
        p.category,
        p.base_cost,
        r.current_price,
        r.suggested_price,
        r.min_price,
        r.max_price,
        r.demand_forecast_avg,
        r.inventory_status,
        r.sentiment_score,
        r.reason_demand,
        r.reason_stock,
        r.reason_sentiment,
        r.confidence_score,
        r.decision,
        r.decision_timestamp,
        r.created_at,
        COALESCE(i.stock_level, 0) as stock_level,
        COALESCE(i.reorder_point, 50) as reorder_point,
        COALESCE(i.lead_time_days, 14) as lead_time_days,
        COALESCE(i.safety_stock, 20) as safety_stock
    FROM recommendations r
    JOIN products p ON r.product_id = p.id
    LEFT JOIN inventory i ON r.product_id = i.product_id
    ORDER BY r.id ASC
    """
    return fetch_all(query)


def update_decision(rec_id, decision_str):
    now_ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = "UPDATE recommendations SET decision = %s, decision_timestamp = %s WHERE id = %s"
    rows = execute_write(query, (decision_str, now_ts, rec_id))
    return rows > 0


def get_reference_date(product_id=None):
    """
    Dynamically finds the latest date in the sales history dataset.
    This guarantees that inventory runout dates and recent sales averages
    align dynamically with whatever dataset is fed in.
    """
    if product_id:
        row = fetch_one("SELECT MAX(date) as max_date FROM sales_history WHERE product_id = %s", (product_id,))
    else:
        row = fetch_one("SELECT MAX(date) as max_date FROM sales_history")

    if row and row.get("max_date"):
        try:
            val = str(row["max_date"])[:10]
            return datetime.datetime.strptime(val, "%Y-%m-%d").date()
        except Exception:
            pass

    return datetime.date.today()


def get_dataset_stats():
    """
    Returns summary statistics about the current live dataset.
    """
    prod_count = fetch_one("SELECT COUNT(*) as c FROM products")
    sales_count = fetch_one("SELECT COUNT(*) as c, MIN(date) as min_date, MAX(date) as max_date FROM sales_history")
    rev_count = fetch_one("SELECT COUNT(*) as c FROM reviews")
    rec_count = fetch_one("SELECT COUNT(*) as c FROM recommendations")
    cats = fetch_all("SELECT DISTINCT category FROM products ORDER BY category ASC")

    return {
        "total_products": prod_count["c"] if prod_count else 0,
        "total_sales_records": sales_count["c"] if sales_count else 0,
        "sales_date_range": {
            "start": str(sales_count.get("min_date") or ""),
            "end": str(sales_count.get("max_date") or ""),
        },
        "total_reviews": rev_count["c"] if rev_count else 0,
        "total_recommendations": rec_count["c"] if rec_count else 0,
        "categories": [c["category"] for c in cats if c.get("category")],
    }


def clear_all_tables():
    """
    Empties all tables so a fresh custom dataset can be fed in cleanly.
    """
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            cur.executescript("""
                DELETE FROM recommendations;
                DELETE FROM reviews;
                DELETE FROM sales_history;
                DELETE FROM inventory;
                DELETE FROM products;
            """)
        else:
            cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
            cur.execute("TRUNCATE TABLE recommendations;")
            cur.execute("TRUNCATE TABLE reviews;")
            cur.execute("TRUNCATE TABLE sales_history;")
            cur.execute("TRUNCATE TABLE inventory;")
            cur.execute("TRUNCATE TABLE products;")
            cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
        conn.commit()
    finally:
        conn.close()


def insert_product(name, sku, category, base_cost, current_price, min_price, max_price, description=""):
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            cur.execute(
                "INSERT INTO products (name, sku, category, base_cost, current_price, min_price, max_price, description) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (name, sku, category, float(base_cost), float(current_price), float(min_price), float(max_price), description)
            )
            p_id = cur.lastrowid
        else:
            cur.execute(
                "INSERT INTO products (name, sku, category, base_cost, current_price, min_price, max_price, description) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (name, sku, category, float(base_cost), float(current_price), float(min_price), float(max_price), description)
            )
            p_id = cur.lastrowid
        conn.commit()
        return p_id
    finally:
        conn.close()


def upsert_inventory(product_id, stock_level, reorder_point, lead_time_days, safety_stock):
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            cur.execute(
                "INSERT OR REPLACE INTO inventory (product_id, stock_level, reorder_point, lead_time_days, safety_stock, last_updated) "
                "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                (product_id, int(stock_level), int(reorder_point), int(lead_time_days), int(safety_stock))
            )
        else:
            cur.execute(
                "INSERT INTO inventory (product_id, stock_level, reorder_point, lead_time_days, safety_stock) "
                "VALUES (%s, %s, %s, %s, %s) "
                "ON DUPLICATE KEY UPDATE stock_level=%s, reorder_point=%s, lead_time_days=%s, safety_stock=%s",
                (product_id, int(stock_level), int(reorder_point), int(lead_time_days), int(safety_stock),
                 int(stock_level), int(reorder_point), int(lead_time_days), int(safety_stock))
            )
        conn.commit()
    finally:
        conn.close()


def insert_sales_batch(sales_records):
    if not sales_records:
        return 0
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            cur.executemany(
                "INSERT INTO sales_history (product_id, date, units_sold, unit_price, revenue, is_promoted, day_of_week) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                [(
                    s["product_id"],
                    str(s["date"])[:10],
                    int(s["units_sold"]),
                    float(s.get("unit_price", 0.0)),
                    float(s.get("revenue", float(s["units_sold"]) * float(s.get("unit_price", 0.0)))),
                    int(s.get("is_promoted", 0)),
                    int(s.get("day_of_week", 0))
                ) for s in sales_records]
            )
        else:
            cur.executemany(
                "INSERT INTO sales_history (product_id, date, units_sold, unit_price, revenue, is_promoted, day_of_week) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                [(
                    s["product_id"],
                    str(s["date"])[:10],
                    int(s["units_sold"]),
                    float(s.get("unit_price", 0.0)),
                    float(s.get("revenue", float(s["units_sold"]) * float(s.get("unit_price", 0.0)))),
                    int(s.get("is_promoted", 0)),
                    int(s.get("day_of_week", 0))
                ) for s in sales_records]
            )
        conn.commit()
        return len(sales_records)
    finally:
        conn.close()


def insert_review(product_id, author, rating, review_text, sentiment_score, sentiment_label, review_date):
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        if db_type == "sqlite":
            cur.execute(
                "INSERT INTO reviews (product_id, author, rating, review_text, sentiment_score, sentiment_label, review_date) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (product_id, author, int(rating), review_text, float(sentiment_score), sentiment_label, str(review_date)[:10])
            )
        else:
            cur.execute(
                "INSERT INTO reviews (product_id, author, rating, review_text, sentiment_score, sentiment_label, review_date) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (product_id, author, int(rating), review_text, float(sentiment_score), sentiment_label, str(review_date)[:10])
            )
        conn.commit()
    finally:
        conn.close()


def upsert_recommendation(rec):
    db_type, conn = get_db()
    try:
        cur = conn.cursor()
        # Delete existing for this product to keep fresh recommendation
        if db_type == "sqlite":
            cur.execute("DELETE FROM recommendations WHERE product_id = ?", (rec["product_id"],))
            cur.execute(
                "INSERT INTO recommendations (product_id, current_price, suggested_price, min_price, max_price, "
                "demand_forecast_avg, inventory_status, sentiment_score, reason_demand, reason_stock, reason_sentiment, confidence_score, decision) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (rec["product_id"], rec["current_price"], rec["suggested_price"], rec["min_price"], rec["max_price"],
                 rec["demand_forecast_avg"], rec["inventory_status"], rec["sentiment_score"], rec["reason_demand"],
                 rec["reason_stock"], rec["reason_sentiment"], rec.get("confidence_score", 0.88), rec.get("decision", "pending"))
            )
        else:
            cur.execute("DELETE FROM recommendations WHERE product_id = %s", (rec["product_id"],))
            cur.execute(
                "INSERT INTO recommendations (product_id, current_price, suggested_price, min_price, max_price, "
                "demand_forecast_avg, inventory_status, sentiment_score, reason_demand, reason_stock, reason_sentiment, confidence_score, decision) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (rec["product_id"], rec["current_price"], rec["suggested_price"], rec["min_price"], rec["max_price"],
                 rec["demand_forecast_avg"], rec["inventory_status"], rec["sentiment_score"], rec["reason_demand"],
                 rec["reason_stock"], rec["reason_sentiment"], rec.get("confidence_score", 0.88), rec.get("decision", "pending"))
            )
        conn.commit()
    finally:
        conn.close()
