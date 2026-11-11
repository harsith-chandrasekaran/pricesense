# PriceSense — AI Demand Forecasting & Pricing Intelligence Dashboard

> **A cinematic, decision-support web application for e-commerce operators, combining gradient-boosting demand forecasting, inventory stockout analytics, VADER review sentiment analysis, and explainable rule-based pricing optimization.**

---

## 🌌 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Recharts, Lucide Icons, Canvas Confetti
- **Backend**: Python 3.10+, Flask (REST API), Flask-CORS, PyMySQL
- **Database**: MySQL 8.0+ (with automatic zero-config SQLite fallback for local evaluation)
- **Machine Learning**: Pandas, NumPy, scikit-learn, XGBoost / Gradient-Boosting Regressor
- **Sentiment**: VADER (Valence Aware Dictionary and sEntiment Reasoner)

---

## 📂 Project Architecture

```
.
├── backend/
│   ├── app.py                   # Flask REST API endpoints & CORS configuration
│   ├── db.py                    # Unified database connector (MySQL + SQLite fallback)
│   └── requirements.txt         # Python dependencies
├── database/
│   ├── schema.sql               # MySQL 8.0 DDL schema (products, inventory, sales, reviews, recs)
│   ├── seed.py                  # Seed script (generates 400 days of sales, reviews, & inventory)
│   ├── seed_data.sql            # Direct SQL seed file for MySQL CLI
│   └── pricesense.db            # Auto-generated SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/          # AnimatedBackground, Sidebar, Header, Footer, CountUp, SkeletonCard
│   │   ├── screens/             # Overview, ForecastStudio, InventoryBoard, SentimentLab, PricingDesk
│   │   ├── services/api.js      # REST API client
│   │   ├── App.jsx              # Main routing & AnimatePresence transitions
│   │   └── index.css            # Custom glassmorphism, neon glows, scrollbars
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── ml/
│   ├── forecaster.py            # Feature engineering, Baseline MA vs Gradient-Boosting, MAE/RMSE/MAPE
│   ├── sentiment.py             # VADER sentiment analysis, compound polarity & review scoring
│   └── pricing_engine.py        # Explainable rule-based pricing formula with margin boundaries
├── .env.example                 # Environment configuration template
└── README.md
```

---

## ⚡ Quickstart Setup Guide

### 1. Prerequisites
- **Node.js** (v18+) & **npm**
- **Python** (3.10+)
- **MySQL** (optional; the app runs automatically on the bundled SQLite database if MySQL credentials are not specified)

---

### 2. Backend & ML Setup

1. **Create and activate a virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **(Optional) Configure MySQL**:
   If you wish to use a local MySQL instance, set the following environment variables (or create a `.env` file):
   ```env
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DB=pricesense_db
   ```
   Import the schema into MySQL:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

4. **Run the Database Seed Script**:
   ```bash
   python database/seed.py
   ```
   *This seeds 10 realistic products across categories, 400 days of daily sales (~4,000 records) with seasonality and holiday spikes, customer reviews scored with VADER, and inventory parameters.*

5. **Start the Flask Backend API**:
   ```bash
   python backend/app.py
   ```
   *The server starts at `http://localhost:5001`.*

---

### 3. Frontend Setup

1. **Open a new terminal and navigate to `/frontend`**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   *Open your browser at `http://localhost:5173`.*

---

## 📐 Explainable Pricing Engine Logic

PriceSense avoids black-box pricing decisions. Recommendations are computed using a **transparent, multi-factor rule-based algorithm** that aligns inventory risk, consumer demand elasticity, and brand sentiment while enforcing strict floor and ceiling guardrails:

$$\text{Suggested Price} = \text{Current Price} \times (1 + \Delta_{\text{Stock}} + \Delta_{\text{Demand}} + \Delta_{\text{Sentiment}})$$

### 1. Inventory & Lead Time Pressure ($\Delta_{\text{Stock}}$)
- **Reorder Threshold** $= (\text{Daily Demand} \times \text{Lead Time Days}) + \text{Safety Stock}$
- **Stockout Risk** ($\text{Stock} < \text{Threshold}$):
  $$\Delta_{\text{Stock}} = +7.5\% \text{ to } +10\%$$
  *Protects remaining inventory and captures scarcity value while supplier reorder is in transit.*
- **Excess Stock** ($\text{Stock} > 2.2 \times \text{Threshold}$):
  $$\Delta_{\text{Stock}} = -10\% \text{ to } -14\%$$
  *Accelerates turnover and frees warehouse capital to avoid storage depreciation.*
- **Healthy Stock**: $\Delta_{\text{Stock}} \approx 0\%$

### 2. Demand Momentum Factor ($\Delta_{\text{Demand}}$)
- Evaluates recent order run-rate against historical baseline:
  - **Surging Demand** ($> +15\%$ above baseline): $\Delta_{\text{Demand}} = +4.5\%$
  - **Softening Demand** ($< -15\%$ below baseline): $\Delta_{\text{Demand}} = -4.0\%$
  - **Stable Demand**: $\Delta_{\text{Demand}} = 0\%$

### 3. VADER Sentiment Goodwill ($\Delta_{\text{Sentiment}}$)
- Computed from customer review polarity ($S \in [-1.0, +1.0]$):
  - **High Goodwill** ($S \ge +0.40$): $\Delta_{\text{Sentiment}} = +3.0\%$ (harvests willingness-to-pay)
  - **Adverse Headwind** ($S \le -0.05$): $\Delta_{\text{Sentiment}} = -4.0\%$ (promotional pricing to regain trust)
  - **Neutral**: $\Delta_{\text{Sentiment}} = 0\%$

### 4. Hard Guardrails & Margin Protection
- **Cost Floor Protection**: Price is guaranteed to never breach minimum gross margin:
  $$\text{Suggested Price} \ge \text{Base Cost} \times 1.15$$
- **Strict Clamping**:
  $$\text{Clamped Price} = \max(\text{Min Price}, \min(\text{Max Price}, \text{Calculated Price}))$$

---

## 🔬 Machine Learning Demand Forecasting

The **Forecast Studio** compares two distinct methodologies:

1. **Baseline Model**: 7-Day Moving Average with seasonal Day-of-Week multiplier.
2. **Advanced Model**: Gradient-Boosting Regressor (`n_estimators=120`, `max_depth=4`, `learning_rate=0.06`) engineered with:
   - Calendar cyclic features: $\sin / \cos$ of day of week, day of month, month, weekend indicator.
   - Autoregressive lag features: `lag_1`, `lag_2`, `lag_3`, `lag_7`, `lag_14`, `lag_21`.
   - Rolling statistics: 7-day, 14-day, and 28-day moving means and standard deviations.

### Strict Empirical Validation
Models are evaluated on a **held-out test split** of the selected horizon (7 or 30 days):
- **MAE** (Mean Absolute Error): Average magnitude of prediction errors in units.
- **RMSE** (Root Mean Squared Error): Penalizes large unexpected spikes.
- **MAPE** (Mean Absolute Percentage Error): Percentage variance against actual sales.

*All metrics displayed in the UI are strictly computed by the Python ML pipeline—never fabricated.*

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend and ML engine health check |
| `GET` | `/api/products` | Catalog listing with inventory parameters |
| `GET` | `/api/forecast/<product_id>?horizon=7\|30` | Baseline vs Gradient-Boosting forecast, metrics, and confidence intervals |
| `GET` | `/api/inventory-risk` | Evaluates stockout, healthy, or excess status per SKU |
| `GET` | `/api/sentiment/<product_id>` | VADER polarity score, breakdown, and scored review snippets |
| `GET` | `/api/recommendations` | Explainable pricing recommendations with driver justifications |
| `POST` | `/api/recommendations/<id>/decision` | Manager Approve (`"approved"`) or Reject (`"rejected"`) decision saved to database |
| `GET` | `/api/kpis` | Real-time aggregate KPI counters and activity stream |

---

## 🎨 Minimal UI & Light/Dark Theme

- **Minimalist Aesthetic**: Clean, airy layout with generous padding, crisp borders, and subtle elevation (inspired by Stripe and Linear).
- **Light & Dark Mode**:
  - Defaults to clean, modern **Light Mode** (`#f8fafc` background, crisp white cards, refined slate typography).
  - One-click **Dark Mode** toggle in the header with persistent state in `localStorage`.
- **Organized Spacing**: Generous card margins, neatly structured metric grids, and distraction-free data visualization.
- **Micro-Interactions**: Confetti burst on recommendation approval, smooth count-up numbers, shimmer skeletons during data fetching, and Recharts line animations.
- **Accessibility**: Full support for `prefers-reduced-motion` and responsive layouts for desktop, laptop, and tablet screens.

