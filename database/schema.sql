-- PriceSense E-Commerce Demand Forecasting & Pricing Database Schema
-- Compatible with MySQL 8.0+

CREATE DATABASE IF NOT EXISTS pricesense_db;
USE pricesense_db;

DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS sales_history;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;

-- 1. Products catalog
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    base_cost DECIMAL(10, 2) NOT NULL,
    current_price DECIMAL(10, 2) NOT NULL,
    min_price DECIMAL(10, 2) NOT NULL,
    max_price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Current Inventory per product
CREATE TABLE inventory (
    product_id INT PRIMARY KEY,
    stock_level INT NOT NULL,
    reorder_point INT NOT NULL,
    lead_time_days INT NOT NULL,
    safety_stock INT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Historical Daily Sales (12+ months)
CREATE TABLE sales_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    date DATE NOT NULL,
    units_sold INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    revenue DECIMAL(10, 2) NOT NULL,
    is_promoted BOOLEAN DEFAULT FALSE,
    day_of_week INT NOT NULL,
    CONSTRAINT fk_sales_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_date (product_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Customer Reviews & Sentiment
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    author VARCHAR(100) NOT NULL,
    rating INT NOT NULL,
    review_text TEXT NOT NULL,
    sentiment_score DECIMAL(5, 4) NOT NULL, -- -1.0 to +1.0
    sentiment_label VARCHAR(20) NOT NULL,  -- 'positive', 'neutral', 'negative'
    review_date DATE NOT NULL,
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_reviews_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. AI Pricing Recommendations & Decision Log
CREATE TABLE recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    current_price DECIMAL(10, 2) NOT NULL,
    suggested_price DECIMAL(10, 2) NOT NULL,
    min_price DECIMAL(10, 2) NOT NULL,
    max_price DECIMAL(10, 2) NOT NULL,
    demand_forecast_avg DECIMAL(10, 2) NOT NULL,
    inventory_status VARCHAR(20) NOT NULL, -- 'stockout', 'healthy', 'excess'
    sentiment_score DECIMAL(5, 4) NOT NULL,
    reason_demand VARCHAR(255) NOT NULL,
    reason_stock VARCHAR(255) NOT NULL,
    reason_sentiment VARCHAR(255) NOT NULL,
    confidence_score DECIMAL(5, 2) DEFAULT 0.88,
    decision VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    decision_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_recommendations_product (product_id),
    INDEX idx_recommendations_decision (decision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

