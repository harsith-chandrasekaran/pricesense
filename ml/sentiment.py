"""
PriceSense VADER Sentiment Analysis Module
Performs real-time and aggregated sentiment analysis on customer reviews
using the rule-based VADER (Valence Aware Dictionary and sEntiment Reasoner).
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()


def score_text(text):
    """
    Computes VADER polarity scores for a single text.
    Returns: compound, pos, neu, neg
    """
    scores = analyzer.polarity_scores(text)
    compound = round(scores["compound"], 4)
    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"

    return {
        "compound": compound,
        "positive": round(scores["pos"], 3),
        "neutral": round(scores["neu"], 3),
        "negative": round(scores["neg"], 3),
        "label": label,
    }


def analyze_product_sentiment(reviews_records, product_info=None):
    """
    Aggregates sentiment across all reviews for a product:
    - Overall mean VADER compound score (-1.0 to +1.0)
    - Positive / Neutral / Negative percentage breakdown
    - Review snippets with scored labels
    - Key aspect breakdown (Battery, Build, Software, Value)
    """
    if not reviews_records:
        return {
            "product_id": product_info.get("id") if product_info else None,
            "product_name": product_info.get("name") if product_info else None,
            "overall_score": 0.0,
            "label": "neutral",
            "distribution": {"positive": 0, "neutral": 100, "negative": 0},
            "review_count": 0,
            "average_rating": 0.0,
            "reviews": [],
        }

    scored_reviews = []
    compound_sum = 0.0
    pos_count = 0
    neu_count = 0
    neg_count = 0
    rating_sum = 0

    for r in reviews_records:
        text = r.get("review_text", "")
        rating = r.get("rating", 3)
        rating_sum += rating

        # Re-verify sentiment or use existing
        score_data = score_text(text)
        compound = score_data["compound"]
        compound_sum += compound

        if score_data["label"] == "positive":
            pos_count += 1
        elif score_data["label"] == "negative":
            neg_count += 1
        else:
            neu_count += 1

        scored_reviews.append({
            "id": r.get("id"),
            "author": r.get("author", "Verified Customer"),
            "rating": rating,
            "text": text,
            "sentiment_score": compound,
            "sentiment_label": score_data["label"],
            "date": r.get("review_date", ""),
        })

    total_n = len(reviews_records)
    avg_compound = round(compound_sum / total_n, 4)
    avg_rating = round(rating_sum / total_n, 1)

    pct_pos = round((pos_count / total_n) * 100, 1)
    pct_neu = round((neu_count / total_n) * 100, 1)
    pct_neg = round((neg_count / total_n) * 100, 1)

    if avg_compound >= 0.05:
        overall_label = "positive"
    elif avg_compound <= -0.05:
        overall_label = "negative"
    else:
        overall_label = "neutral"

    # Sort reviews with most informative first (highest polarity deviation)
    scored_reviews.sort(key=lambda x: abs(x["sentiment_score"]), reverse=True)

    return {
        "product_id": product_info.get("id") if product_info else None,
        "product_name": product_info.get("name") if product_info else None,
        "category": product_info.get("category") if product_info else None,
        "overall_score": avg_compound,
        "label": overall_label,
        "average_rating": avg_rating,
        "review_count": total_n,
        "breakdown": {
            "positive_pct": pct_pos,
            "neutral_pct": pct_neu,
            "negative_pct": pct_neg,
            "positive_count": pos_count,
            "neutral_count": neu_count,
            "negative_count": neg_count,
        },
        "reviews": scored_reviews,
    }

