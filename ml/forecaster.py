"""
PriceSense ML Demand Forecasting Engine
Implements:
1. Baseline Moving Average model (with seasonal day-of-week adjustment)
2. Advanced XGBoost Gradient-Boosting Regressor with lag & calendar feature engineering
3. Rigorous validation on a held-out evaluation window (horizon: 7 or 30 days)
4. Exact metrics computation: MAE, RMSE, MAPE
5. Future multi-step projection with confidence intervals
"""

import math
import datetime
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

# Try XGBoost if runtime environment has libomp; otherwise use scikit-learn's tuned Gradient Boosting
USE_XGB = False
try:
    import xgboost as xgb
    test_m = xgb.XGBRegressor(n_estimators=2)
    test_m.fit(np.array([[1, 2], [3, 4]]), np.array([1, 2]))
    USE_XGB = True
except Exception:
    USE_XGB = False

from sklearn.ensemble import GradientBoostingRegressor


def build_time_series_features(df):
    """
    Constructs lag features, rolling statistics, and calendar attributes
    for supervised regression on time series data.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Calendar features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([4, 5, 6]).astype(int)

    # Cyclical day of week encoding
    df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)

    # Lags of units_sold
    for lag in [1, 2, 3, 7, 14, 21]:
        df[f"lag_{lag}"] = df["units_sold"].shift(lag)

    # Rolling statistics
    df["rolling_mean_7"] = df["units_sold"].shift(1).rolling(window=7, min_periods=3).mean()
    df["rolling_std_7"] = df["units_sold"].shift(1).rolling(window=7, min_periods=3).std().fillna(0)
    df["rolling_mean_14"] = df["units_sold"].shift(1).rolling(window=14, min_periods=5).mean()
    df["rolling_mean_28"] = df["units_sold"].shift(1).rolling(window=28, min_periods=7).mean()

    # Drop early rows with NaN from lags
    df_clean = df.dropna().reset_index(drop=True)
    return df_clean


def get_gradient_boosting_model():
    if USE_XGB:
        import xgboost as xgb
        return xgb.XGBRegressor(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.06,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            n_jobs=1
        ), "XGBoost Regressor (Tuned)"
    else:
        return GradientBoostingRegressor(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.06,
            subsample=0.85,
            random_state=42
        ), "Gradient-Boosting Regressor"


def compute_mape(y_true, y_pred):
    """
    Mean Absolute Percentage Error safely handling zero sales.
    """
    y_true = np.array(y_true, dtype=float)
    y_pred = np.array(y_pred, dtype=float)
    denom = np.maximum(y_true, 1.0)
    return float(np.mean(np.abs((y_true - y_pred) / denom)) * 100.0)


def run_forecast(sales_records, horizon=7, product_info=None):
    """
    Runs both baseline and advanced comparison model.
    Evaluates on held-out test window of length `horizon`.
    Generates future predictions for the next `horizon` days.
    """
    if not sales_records or len(sales_records) < 40:
        raise ValueError("Insufficient sales records to train forecasting models (minimum 40 required).")

    raw_df = pd.DataFrame(sales_records)
    raw_df["date"] = pd.to_datetime(raw_df["date"])
    raw_df = raw_df.sort_values("date").reset_index(drop=True)

    horizon = 30 if int(horizon) == 30 else 7

    # Feature engineering
    feat_df = build_time_series_features(raw_df)

    # Split: Held-out validation period (last `horizon` days)
    test_size = horizon
    train_df = feat_df.iloc[:-test_size].copy()
    test_df = feat_df.iloc[-test_size:].copy()

    feature_cols = [
        "day_of_week", "day_of_month", "month", "is_weekend",
        "dow_sin", "dow_cos",
        "lag_1", "lag_2", "lag_3", "lag_7", "lag_14", "lag_21",
        "rolling_mean_7", "rolling_std_7", "rolling_mean_14", "rolling_mean_28",
        "is_promoted"
    ]

    X_train = train_df[feature_cols]
    y_train = train_df["units_sold"].values

    X_test = test_df[feature_cols]
    y_test = test_df["units_sold"].values

    # 1. Advanced Model: Gradient-Boosting Regressor
    model, model_label = get_gradient_boosting_model()
    model.fit(X_train, y_train)
    y_pred_xgb = model.predict(X_test)
    y_pred_xgb = np.maximum(0, y_pred_xgb)

    # 2. Baseline Model: 7-day Rolling Average with day-of-week ratio
    # Baseline predicts test period using 7-day moving average from preceding window
    baseline_window = train_df["units_sold"].iloc[-7:].values
    base_avg = float(np.mean(baseline_window))
    
    # Seasonality weights by day of week from training data
    dow_means = train_df.groupby("day_of_week")["units_sold"].mean()
    overall_mean = train_df["units_sold"].mean()
    dow_ratios = (dow_means / max(overall_mean, 1e-5)).to_dict()

    y_pred_baseline = []
    for _, row in test_df.iterrows():
        dow = int(row["day_of_week"])
        ratio = dow_ratios.get(dow, 1.0)
        y_pred_baseline.append(max(0, base_avg * ratio))
    y_pred_baseline = np.array(y_pred_baseline)

    # 3. Metrics on Held-out test period
    mae_xgb = float(mean_absolute_error(y_test, y_pred_xgb))
    rmse_xgb = float(np.sqrt(mean_squared_error(y_test, y_pred_xgb)))
    mape_xgb = compute_mape(y_test, y_pred_xgb)

    mae_base = float(mean_absolute_error(y_test, y_pred_baseline))
    rmse_base = float(np.sqrt(mean_squared_error(y_test, y_pred_baseline)))
    mape_base = compute_mape(y_test, y_pred_baseline)

    mae_improvement = round(((mae_base - mae_xgb) / max(mae_base, 1e-5)) * 100.0, 1)

    # Validation records (actual vs predictions on held-out window)
    validation_series = []
    for i, (_, row) in enumerate(test_df.iterrows()):
        validation_series.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "actual": int(y_test[i]),
            "baseline": round(float(y_pred_baseline[i]), 1),
            "advanced": round(float(y_pred_xgb[i]), 1),
        })

    # 4. Generate Future Forecast (next `horizon` days from end of series)
    # Refit comparison model on all available data for future projection
    model_full, _ = get_gradient_boosting_model()
    X_all = feat_df[feature_cols]
    y_all = feat_df["units_sold"].values
    model_full.fit(X_all, y_all)

    # Residual standard deviation for confidence intervals
    residuals = y_all - model_full.predict(X_all)
    residual_std = float(np.std(residuals))

    # Multi-step autoregressive future forecasting
    last_known_date = raw_df["date"].max()
    future_records = []
    
    # Maintain buffer of units sold
    recent_history = list(raw_df["units_sold"].values)
    full_dow_means = raw_df.groupby(raw_df["date"].dt.dayofweek)["units_sold"].mean()
    full_mean = raw_df["units_sold"].mean()
    full_dow_ratios = (full_dow_means / max(full_mean, 1e-5)).to_dict()
    recent_7_avg = float(np.mean(recent_history[-7:]))

    for step in range(1, horizon + 1):
        f_date = last_known_date + datetime.timedelta(days=step)
        f_dow = f_date.weekday()
        f_dom = f_date.day
        f_month = f_date.month
        f_is_wknd = 1 if f_dow in [4, 5, 6] else 0

        # Construct features for this future step
        lag_1 = recent_history[-1]
        lag_2 = recent_history[-2] if len(recent_history) >= 2 else lag_1
        lag_3 = recent_history[-3] if len(recent_history) >= 3 else lag_1
        lag_7 = recent_history[-7] if len(recent_history) >= 7 else lag_1
        lag_14 = recent_history[-14] if len(recent_history) >= 14 else lag_1
        lag_21 = recent_history[-21] if len(recent_history) >= 21 else lag_1

        roll_7 = float(np.mean(recent_history[-7:]))
        roll_std_7 = float(np.std(recent_history[-7:]))
        roll_14 = float(np.mean(recent_history[-14:]))
        roll_28 = float(np.mean(recent_history[-28:]))

        row_dict = {
            "day_of_week": f_dow,
            "day_of_month": f_dom,
            "month": f_month,
            "is_weekend": f_is_wknd,
            "dow_sin": np.sin(2 * np.pi * f_dow / 7),
            "dow_cos": np.cos(2 * np.pi * f_dow / 7),
            "lag_1": lag_1,
            "lag_2": lag_2,
            "lag_3": lag_3,
            "lag_7": lag_7,
            "lag_14": lag_14,
            "lag_21": lag_21,
            "rolling_mean_7": roll_7,
            "rolling_std_7": roll_std_7,
            "rolling_mean_14": roll_14,
            "rolling_mean_28": roll_28,
            "is_promoted": 0,
        }
        X_step = pd.DataFrame([row_dict])[feature_cols]
        pred_val = float(max(0, model_full.predict(X_step)[0]))

        # Baseline forecast for this step
        base_step_val = max(0, recent_7_avg * full_dow_ratios.get(f_dow, 1.0))

        # Expanding confidence interval over horizon
        uncertainty_factor = 1.0 + (step * 0.04)
        margin = 1.96 * residual_std * uncertainty_factor
        lower_b = max(0, round(pred_val - margin, 1))
        upper_b = round(pred_val + margin, 1)

        future_records.append({
            "date": f_date.strftime("%Y-%m-%d"),
            "baseline": round(base_step_val, 1),
            "advanced": round(pred_val, 1),
            "lower_bound": lower_b,
            "upper_bound": upper_b,
        })

        # Append prediction to history for next recursive steps
        recent_history.append(pred_val)

    # 5. Recent history (last 45 days) for visual continuity on charts
    recent_history_records = []
    for _, row in raw_df.tail(45).iterrows():
        recent_history_records.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "actual": int(row["units_sold"]),
            "revenue": float(row["revenue"]),
            "unit_price": float(row["unit_price"]),
            "is_promoted": int(row.get("is_promoted", 0)),
        })

    # Total projected demand for the upcoming horizon
    total_projected_advanced = round(sum(item["advanced"] for item in future_records), 1)
    total_projected_baseline = round(sum(item["baseline"] for item in future_records), 1)
    avg_daily_projected = round(total_projected_advanced / horizon, 1)

    return {
        "horizon": horizon,
        "product_id": product_info.get("id") if product_info else None,
        "product_name": product_info.get("name") if product_info else None,
        "sku": product_info.get("sku") if product_info else None,
        "metrics": {
            "advanced": {
                "model_name": model_label,
                "mae": round(mae_xgb, 2),
                "rmse": round(rmse_xgb, 2),
                "mape": round(mape_xgb, 2),
            },
            "baseline": {
                "model_name": "Seasonal 7-Day Moving Average",
                "mae": round(mae_base, 2),
                "rmse": round(rmse_base, 2),
                "mape": round(mape_base, 2),
            },
            "mae_improvement_pct": mae_improvement,
            "test_sample_count": len(test_df),
        },
        "summary": {
            "total_projected_demand": total_projected_advanced,
            "avg_daily_projected": avg_daily_projected,
            "baseline_projected_demand": total_projected_baseline,
        },
        "recent_history": recent_history_records,
        "held_out_validation": validation_series,
        "future_forecast": future_records,
    }
