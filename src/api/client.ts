// src/api/client.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const apiClient: AxiosInstance = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      console.error('[API] Network error:', error.message);
    } else if (error.response) {
      console.error(`[API] ${error.response.status}:`, error.response.data);
    } else {
      console.error('[API] Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const checkHealth = () => apiClient.get('/health').then(r => r.data);
export const getEDASummary = () => apiClient.get('/api/eda/summary').then(r => r.data);
export const getChartData = (chartName: string) => apiClient.get(`/api/eda/charts/${chartName}`).then(r => r.data);
export const getModelComparison = () => apiClient.get('/api/models/compare').then(r => r.data);
export const getConfusionMatrix = (modelId: string) => apiClient.get(`/api/models/${modelId}/confusion-matrix`).then(r => r.data);
export const getROCData = (modelId: string) => apiClient.get(`/api/models/${modelId}/roc-data`).then(r => r.data);
export const getSHAPAnalysis = () => apiClient.get('/api/shap/feature-importance').then(r => r.data);
export const getSHAPBarPlot = () => apiClient.get('/api/shap/bar-plot').then(r => r.data);
export const predictSeverity = (data: Record<string, any>) => apiClient.post('/api/predict', data).then(r => r.data);
export const getPredictionForm = () => apiClient.get('/api/filters/options').then(r => r.data);
export const getDatasetsInfo = () => apiClient.get('/api/datasets/info').then(r => r.data);
export const getDataHealth = () => apiClient.get('/api/health').then(r => r.data);

export default apiClient;