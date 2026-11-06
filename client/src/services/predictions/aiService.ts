import { apiClient } from '../api/client';
import { AIMetricsResponse, CounterRecommendation, CrowdForecastItem } from '../../types';

export interface MLPredictionResult {
  status: 'success' | 'unavailable' | 'error';
  predicted_wait_minutes?: number;
  predicted_service_minutes?: number;
  calibrated_uncertainty_minutes?: number;
  confidence_score?: number;
  is_ml_prediction: boolean;
  model_version?: string;
  algorithm?: string;
  factors?: Array<{ factor: string; impact: string }>;
  error?: string;
  timestamp: string;
}

export const aiService = {
  async predictWaitingTime(data: {
    department_code: string;
    queue_length: number;
    available_doctors: number;
    active_workload?: number;
    priority?: string;
    hour_of_day?: number;
    day_of_week?: number;
  }): Promise<MLPredictionResult> {
    return apiClient<MLPredictionResult>('/api/v1/ai/predict-waiting-time', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async predictServiceTime(data: {
    department_code: string;
    reason_category?: string;
    priority?: string;
    hour_of_day?: number;
    day_of_week?: number;
  }): Promise<MLPredictionResult> {
    return apiClient<MLPredictionResult>('/api/v1/ai/predict-service-time', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getModelStatus(): Promise<{
    status: 'online' | 'offline';
    is_loaded: boolean;
    metadata: any;
    timestamp: string;
  }> {
    return apiClient('/api/v1/ai/model-status');
  },

  async getCrowdForecast(): Promise<{
    forecast: CrowdForecastItem[];
    forecast_horizon: string;
    model: string;
    timestamp: string;
  }> {
    return apiClient('/api/v1/ai/crowd-forecast');
  },

  async getCounterRecommendations(): Promise<{
    recommendations: CounterRecommendation[];
    optimization_engine: string;
    timestamp: string;
  }> {
    return apiClient('/api/v1/ai/counter-recommendations');
  },

  async getAIMetrics(): Promise<AIMetricsResponse> {
    return apiClient<AIMetricsResponse>('/api/v1/ai/metrics');
  },
};
