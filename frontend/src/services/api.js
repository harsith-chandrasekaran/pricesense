/**
 * PriceSense API Client
 * Connects to the Flask ML & Decision Support Backend.
 */

const API_BASE = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error || errorJson.message || errorDetail;
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export const api = {
  // 1. Health check
  async getHealth() {
    return handleResponse(await fetch(`${API_BASE}/health`));
  },

  // 2. Catalog products
  async getProducts() {
    return handleResponse(await fetch(`${API_BASE}/products`));
  },

  // 3. Demand forecast (horizon = 7 or 30)
  async getForecast(productId, horizon = 7) {
    return handleResponse(await fetch(`${API_BASE}/forecast/${productId}?horizon=${horizon}`));
  },

  // 4. Inventory risk evaluation
  async getInventoryRisk() {
    return handleResponse(await fetch(`${API_BASE}/inventory-risk`));
  },

  // 5. VADER Sentiment analysis
  async getSentiment(productId) {
    return handleResponse(await fetch(`${API_BASE}/sentiment/${productId}`));
  },

  // 6. Pricing recommendations
  async getRecommendations() {
    return handleResponse(await fetch(`${API_BASE}/recommendations`));
  },

  // 7. Record approval/rejection decision
  async postDecision(recId, decision) {
    return handleResponse(await fetch(`${API_BASE}/recommendations/${recId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    }));
  },

  // 8. Overview KPIs & Activity stream
  async getKpis() {
    return handleResponse(await fetch(`${API_BASE}/kpis`));
  },
};

