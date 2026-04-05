// src/hooks/useApi.ts
import { useState, useEffect, useCallback } from 'react';
import {
  checkHealth,
  getEDASummary,
  getModelComparison,
  getSHAPAnalysis,
  predictSeverity,
  getPredictionForm,
  getDatasetsInfo,
  getChartData,
} from '../api/client';

interface QueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function useQuery<T>(fetcher: () => Promise<T>): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Request failed');
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

export const useHealth = () => useQuery(checkHealth);
export const useEDA = () => useQuery(getEDASummary);
export const useModels = () => useQuery(getModelComparison);
export const useSHAP = () => useQuery(getSHAPAnalysis);
export const usePredictionFilters = () => useQuery(getPredictionForm);
export const useDatasets = () => useQuery(getDatasetsInfo);
export const useChartData = (name: string) => useQuery(() => getChartData(name));

interface PredictionHook {
  data: any;
  isPending: boolean;
  error: string | null;
  mutate: (input: Record<string, any>) => Promise<void>;
  reset: () => void;
}

export const usePrediction = (): PredictionHook => {
  const [data, setData] = useState<any>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (input: Record<string, any>) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await predictSeverity(input);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Prediction failed');
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isPending, error, mutate, reset };
};