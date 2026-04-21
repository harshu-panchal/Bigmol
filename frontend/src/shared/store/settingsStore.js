import { create } from "zustand";
import toast from "react-hot-toast";
import * as adminService from "../../modules/Admin/services/adminService";
import logoImage from "../../../data/logos/BigMol_Logo.png";

const defaultSettings = {
  general: {
    storeName: "Bigmol Store",
    storeLogo: logoImage,
    favicon: logoImage,
    contactEmail: "",
    contactPhone: "",
    address: "",
    businessHours: "Mon-Fri 9AM-6PM",
    timezone: "UTC",
    currency: "INR",
    language: "en",
    socialMedia: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
    },
    accentColor: "#FFE11B",
    storeDescription: "",
  },
  payment: {
    paymentMethods: ["cod", "card", "wallet"],
    codEnabled: true,
    cardEnabled: true,
    walletEnabled: true,
    upiEnabled: false,
    paymentGateway: "stripe",
    stripePublicKey: "",
    stripeSecretKey: "",
    paymentFees: {
      cod: 0,
      card: 2.5,
      wallet: 1.5,
      upi: 0.5,
    },
  },
  shipping: {
    shippingZones: [],
    freeShippingThreshold: 100,
    defaultShippingRate: 5,
    shippingMethods: ["standard", "express"],
  },
  orders: {
    cancellationTimeLimit: 24, // hours
    minimumOrderValue: 0,
    orderTrackingEnabled: true,
    orderConfirmationEmail: true,
    orderStatuses: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ],
  },
  customers: {
    guestCheckoutEnabled: true,
    registrationRequired: false,
    emailVerificationRequired: false,
    customerAccountFeatures: {
      orderHistory: true,
      wishlist: true,
      addresses: true,
    },
  },
  products: {
    itemsPerPage: 12,
    gridColumns: 4,
    defaultSort: "popularity",
    lowStockThreshold: 10,
    outOfStockBehavior: "show", // 'hide' or 'show'
    stockAlertsEnabled: true,
  },
  tax: {
    defaultTaxRate: 18,
    taxCalculationMethod: "exclusive", // 'inclusive' or 'exclusive'
    priceDisplayFormat: "INR", // Currency format
  },
  content: {
    privacyPolicy: "",
    termsConditions: "",
    refundPolicy: "",
  },
  features: {
    wishlistEnabled: true,
    reviewsEnabled: true,
    flashSaleEnabled: true,
    dailyDealsEnabled: true,
    liveChatEnabled: true,
    couponCodesEnabled: true,
  },
  homepage: {
    heroBannerEnabled: true,
    sections: {
      mostPopular: { enabled: true, order: 1 },
      trending: { enabled: true, order: 2 },
      flashSale: { enabled: true, order: 3 },
      dailyDeals: { enabled: true, order: 4 },
      recommended: { enabled: true, order: 5 },
    },
  },
  reviews: {
    moderationMode: "manual", // 'auto' or 'manual'
    purchaseRequired: true,
    displaySettings: {
      showAll: true,
      verifiedOnly: false,
      withPhotosOnly: false,
    },
  },
  email: {
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "noreply@example.com",
    fromName: "Bigmol Store",
  },
  notifications: {
    email: {
      orderConfirmation: true,
      shippingUpdate: true,
      deliveryUpdate: true,
    },
    smsEnabled: false,
    pushEnabled: false,
    admin: {
      newOrders: true,
      lowStock: true,
    },
  },
  seo: {
    metaTitle: "Bigmol Store - Shop Online",
    metaDescription: "Shop the latest trends and products",
    metaKeywords: "ecommerce, shopping, online store",
    ogImage: logoImage,
    canonicalUrl: "",
  },
  theme: {
    primaryColor: "#10B981",
    secondaryColor: "#3B82F6",
    fontFamily: "Inter",
  },
};

export const useSettingsStore = create((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  error: null,

  // Initialize settings (fetch from backend)
  initialize: async () => {
    set({ isLoading: true });
    try {
      const response = await adminService.getSettings();
      if (response.data) {
        // Merge fetched settings into default settings
        set({ 
          settings: { ...defaultSettings, ...response.data }, 
          isLoading: false 
        });
      } else {
        set({ settings: defaultSettings, isLoading: false });
      }
    } catch (error) {
      console.error("Failed to load settings from server:", error);
      // Fallback to default but set error
      set({ settings: defaultSettings, isLoading: false, error: error.message });
    }
  },

  // Get settings (wait for load if needed)
  getSettings: () => {
    return get().settings;
  },

  // Update settings
  updateSettings: async (category, settingsData) => {
    set({ isLoading: true });
    try {
      const currentSettings = get().settings;
      const updatedSettings = {
        ...currentSettings,
        [category]: {
          ...currentSettings[category],
          ...settingsData,
        },
      };

      // Persist to backend
      await adminService.updateSettings(updatedSettings);
      
      set({ settings: updatedSettings, isLoading: false });
      toast.success("Settings updated on server successfully");
      return updatedSettings;
    } catch (error) {
      set({ isLoading: false });
      toast.error("Failed to save settings to server");
      throw error;
    }
  },

  // Bulk update (internal)
  setSettings: (newSettings) => set({ settings: newSettings }),
}));
