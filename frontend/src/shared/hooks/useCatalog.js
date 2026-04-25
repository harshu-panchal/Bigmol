import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export const useProducts = (params = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async ({ signal }) => {
      const response = await api.get('/products', { 
        params,
        signal // React Query provides AbortController signal
      });
      return response?.data || response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useBanners = () => {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const response = await api.get('/banners');
      return response?.data || response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useVendors = (params = { status: 'approved', page: 1, limit: 50 }) => {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: async () => {
      const response = await api.get('/vendors/all', { params });
      return response?.data || response;
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useBrands = () => {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await api.get('/brands/all');
      return response?.data || response;
    },
    staleTime: 30 * 60 * 1000, // Brands don't change often
  });
};
