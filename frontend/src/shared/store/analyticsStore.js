import { create } from 'zustand';
import * as adminService from '../../modules/Admin/services/adminService';
import toast from 'react-hot-toast';

export const useAnalyticsStore = create((set, get) => ({
    dashboardStats: null,
    revenueData: [],
    financialSummary: [],
    profitLossData: [],
    orderTrendsData: [],
    paymentBreakdownData: null,
    inventoryStats: null,
    isLoading: false,
    error: null,

    fetchDashboardStats: async () => {
        set({ isLoading: true });
        try {
            const response = await adminService.getDashboardStats();
            set({ dashboardStats: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchFinancialSummary: async (period = 'monthly', params = {}) => {
        set({ isLoading: true });
        try {
            const response = await adminService.getFinancialSummary(period, params);
            set({ financialSummary: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
            toast.error('Failed to fetch financial data');
        }
    },

    fetchInventoryStats: async () => {
        set({ isLoading: true });
        try {
            const response = await adminService.getInventoryStats();
            set({ inventoryStats: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchRevenueData: async (period = 'monthly', params = {}) => {
        set({ isLoading: true });
        try {
            const response = await adminService.getRevenueData(period, params);
            set({ revenueData: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchProfitLoss: async (period = 'monthly', params = {}) => {
        set({ isLoading: true });
        try {
            const response = await adminService.getProfitLoss(period, params);
            set({ profitLossData: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
            toast.error('Failed to fetch profit and loss data');
        }
    },

    fetchOrderTrends: async (period = 'daily', params = {}) => {
        set({ isLoading: true });
        try {
            const response = await adminService.getOrderTrends(period, params);
            set({ orderTrendsData: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
            toast.error('Failed to fetch order trends');
        }
    },

    fetchPaymentBreakdown: async () => {
        set({ isLoading: true });
        try {
            const response = await adminService.getPaymentBreakdown();
            set({ paymentBreakdownData: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
            toast.error('Failed to fetch payment breakdown');
        }
    }
}));
