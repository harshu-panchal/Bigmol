import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiTag } from "react-icons/fi";
import LazyImage from "../../../../shared/components/LazyImage";
import { getNewArrivals } from "../../data/catalogData";

const NewArrivalsSection = ({ products = null }) => {
  const fallback = getNewArrivals(6);
  const newArrivals = Array.isArray(products) && products.length > 0
    ? products.slice(0, 6)
    : fallback;

  if (newArrivals.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
      className="relative mx-4 my-4 rounded-2xl overflow-hidden shadow-xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500">
      {/* Animated Gradient Overlay */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
            "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
            "linear-gradient(225deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
            "linear-gradient(315deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
            "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Decorative Background Pattern with Floating Animation */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"
          animate={{
            x: [0, 20, 0],
            y: [0, 15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full blur-2xl"
          animate={{
            x: [0, -15, 0],
            y: [0, -10, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative px-3 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-1">
              <FiTag className="text-white text-xs" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white drop-shadow-lg leading-none">New Arrivals</h2>
              <p className="text-[9px] text-white/80 font-medium">Fresh products just added</p>
            </div>
          </div>
          <Link
            to="/new-arrivals"
            className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-white/30 transition-all"
          >
            See All
          </Link>
        </div>

        {/* Products — horizontal scroll of square image tiles */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
          {newArrivals.map((product, index) => {
            const productLink = `/product/${product.id}`;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06, type: "spring", stiffness: 120, damping: 12 }}
                className="flex-shrink-0"
              >
                <Link to={productLink} className="block">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm">
                    <LazyImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      onError={(e) => { e.target.src = "https://via.placeholder.com/80x80?text=Product"; }}
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default NewArrivalsSection;
