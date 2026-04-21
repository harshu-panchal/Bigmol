import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiClock, 
  FiChevronLeft, 
  FiCalendar, 
  FiPieChart,
  FiActivity
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../../../shared/components/PageTransition';
import { formatPrice } from '../../../shared/utils/helpers';
import { useDeliveryAuthStore } from '../store/deliveryStore';

const Earnings = () => {
  const navigate = useNavigate();
  const { earnings, fetchEarnings } = useDeliveryAuthStore();
  const [period, setPeriod] = useState('today');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchEarnings(period);
      setIsLoading(false);
    };
    load();
  }, [period, fetchEarnings]);

  const statCards = [
    { 
      label: 'Deliveries', 
      value: earnings.totalDeliveries, 
      icon: FiActivity, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Earnings', 
      value: formatPrice(earnings.totalEarnings), 
      icon: FiDollarSign, 
      color: 'text-green-600', 
      bg: 'bg-green-50' 
    },
    { 
      label: 'Pending Cash', 
      value: formatPrice(earnings.pendingCash), 
      icon: FiClock, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-50' 
    },
    { 
      label: 'Settled', 
      value: formatPrice(earnings.settledCash), 
      icon: FiCheckCircle, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
  ];

  return (
    <PageTransition>
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiChevronLeft className="text-xl" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Earnings</h1>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-2xl">
          {['today', 'week', 'month', 'all'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-3 text-sm font-bold capitalize rounded-xl transition-all ${
                period === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {statCards.map((card, idx) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between"
            >
              <div className={`${card.bg} ${card.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                <card.icon className="text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{card.label}</p>
                <p className={`text-xl font-bold text-gray-900`}>
                  {isLoading ? '...' : card.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info Card */}
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-xl">
              <FiTrendingUp className="text-xl" />
            </div>
            <h3 className="font-bold">Weekly Performance</h3>
          </div>
          <p className="text-indigo-100 text-sm leading-relaxed mb-6">
            Your earnings are calculated per delivery. Cash collected for COD orders must be settled weekly with the admin.
          </p>
          <div className="h-2 w-full bg-indigo-500 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '65%' }}
              className="h-full bg-white"
            />
          </div>
          <div className="flex justify-between mt-3 text-xs text-indigo-200 font-medium">
            <span>Weekly Goal: 50 Deliveries</span>
            <span>65% Achieved</span>
          </div>
        </div>

        {/* Recent Transactions List Placeholder */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800">Payment Guidelines</h3>
          <div className="space-y-3">
            {[
              { icon: FiPieChart, text: 'Delivery fee is paid instantly per order' },
              { icon: FiDollarSign, text: 'COD cash settlement happens every Monday' },
              { icon: FiCalendar, text: 'Bank transfers are processed within 24 hours' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm">
                  <item.icon />
                </div>
                <p className="text-sm text-gray-600 font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

// Internal Import helper
const FiCheckCircle = (props) => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default Earnings;
