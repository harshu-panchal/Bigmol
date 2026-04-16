import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiClock, FiZap } from "react-icons/fi";
import ProductCard from "../../../../shared/components/ProductCard";
import { getDailyDeals } from "../../data/catalogData";

const DailyDealsSection = ({ products = null }) => {
  const fallback = getDailyDeals().slice(0, 8);
  const dailyDeals = Array.isArray(products) && products.length > 0 ? products.slice(0, 8) : fallback;

  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const eod = new Date(); eod.setHours(23, 59, 59, 999);
      const diff = eod - now;
      if (diff > 0) {
        setTimeLeft({
          hours: Math.floor((diff / 3600000) % 24),
          minutes: Math.floor((diff / 60000) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (v) => String(v).padStart(2, "0");

  if (!dailyDeals.length) return null;

  return (
    <div className="relative my-2 mx-3 rounded-xl overflow-hidden border border-red-200 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full blur-xl" />
      </div>

      <div className="relative px-3 pt-3 pb-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-1">
              <FiZap className="text-white text-xs" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white uppercase tracking-tight leading-none">Daily Deals</h2>
              <p className="text-[9px] text-white/80 font-medium">Up to 70% OFF</p>
            </div>
          </div>
          <Link to="/daily-deals" className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-white/30 transition-all">
            See All
          </Link>
        </div>

        {/* Compact countdown */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 mb-3 bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 w-fit"
        >
          <FiClock className="text-white text-xs flex-shrink-0" />
          <span className="text-white text-[9px] font-semibold">Ends in</span>
          {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((val, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="bg-white text-red-600 font-extrabold text-[10px] rounded px-1 py-0.5 min-w-[1.5rem] text-center">
                {pad(val)}
              </span>
              {i < 2 && <span className="text-white font-bold text-xs">:</span>}
            </span>
          ))}
        </motion.div>

        {/* Products — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
          {dailyDeals.map((product) => (
            <div key={product.id} className="flex-shrink-0" style={{ width: "42vw", maxWidth: 170 }}>
              <ProductCard product={product} isFlashSale={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyDealsSection;
