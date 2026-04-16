import { Link } from 'react-router-dom';
import { FiShoppingBag, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import LazyImage from '../../../../shared/components/LazyImage';

const VendorShowcaseCard = ({ vendor, index = 0 }) => {
  if (!vendor) return null;
  const vendorLink = `/seller/${vendor.id}`;
  const initial = (vendor.storeName || vendor.name || '?').charAt(0).toUpperCase();

  return (
    <Link to={vendorLink} className="flex-shrink-0">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07 }}
        whileTap={{ scale: 0.97 }}
        className="glass-card rounded-xl p-2.5 flex flex-col items-center text-center w-[110px] min-w-[110px] h-[130px]"
      >
        {/* Avatar */}
        <div className="relative mb-2">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow-md">
            {vendor.storeLogo ? (
              <LazyImage
                src={vendor.storeLogo}
                alt={vendor.storeName || vendor.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span className="text-base font-bold text-white">{initial}</span>
            )}
          </div>
          {vendor.isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-accent-500 rounded-full p-0.5 border-2 border-white">
              <FiCheckCircle className="text-white" style={{ fontSize: 7 }} />
            </div>
          )}
        </div>

        {/* Name — 2 lines max, clamp keeps height fixed */}
        <h3
          className="font-bold text-gray-800 text-[10px] line-clamp-2 overflow-hidden w-full text-center leading-tight mb-1.5"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.4em", maxHeight: "2.4em" }}
          title={vendor.storeName || vendor.name}
        >
          {vendor.storeName || vendor.name}
        </h3>

        {/* Product count */}
        <div className="flex items-center gap-0.5 text-[9px] text-gray-500 mb-1.5">
          <FiShoppingBag className="text-primary-400" style={{ fontSize: 9 }} />
          <span>{vendor.totalProducts || 0} products</span>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-center gap-0.5 text-primary-600 text-[9px] font-bold">
          <span>Visit</span>
          <FiArrowRight style={{ fontSize: 9 }} />
        </div>
      </motion.div>
    </Link>
  );
};

export default VendorShowcaseCard;
