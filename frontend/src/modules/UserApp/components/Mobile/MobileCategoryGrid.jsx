import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { categories as fallbackCategories } from "../../../../data/categories";
import LazyImage from "../../../../shared/components/LazyImage";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import { FiArrowRight } from "react-icons/fi";

const normalizeId = (value) => String(value ?? "").trim();

const MobileCategoryGrid = () => {
  const { categories, initialize, getRootCategories } = useCategoryStore();

  useEffect(() => { initialize(); }, [initialize]);

  const displayCategories = useMemo(() => {
    const roots = getRootCategories().filter((cat) => cat.isActive !== false);
    if (!roots.length) return fallbackCategories;
    return roots.map((cat) => {
      const fallbackCat = fallbackCategories.find(
        (fc) => normalizeId(fc.id) === normalizeId(cat.id) || fc.name?.toLowerCase() === cat.name?.toLowerCase()
      );
      return { ...(fallbackCat || {}), ...cat, image: cat.image || fallbackCat?.image || "" };
    });
  }, [categories, getRootCategories]);

  return (
    <div className="px-3 py-2.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-800">Browse Categories</h2>
        <Link to="/search" className="flex items-center gap-0.5 text-[10px] text-primary-600 font-semibold">
          <span>See All</span>
          <FiArrowRight style={{ fontSize: 10 }} />
        </Link>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
        {displayCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.04 }}
            className="flex-shrink-0"
          >
            <Link to={`/category/${category.id}`} className="flex flex-col items-center gap-1 w-14">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                <LazyImage
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = "https://via.placeholder.com/48x48?text=Cat"; }}
                />
              </div>
              <span className="text-[9px] font-semibold text-gray-700 text-center line-clamp-1 w-full">
                {category.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MobileCategoryGrid;
