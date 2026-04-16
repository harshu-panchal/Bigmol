import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FiThumbsUp, FiArrowRight } from "react-icons/fi";
import ProductCard from "../../../../shared/components/ProductCard";
import { getRecommendedProducts } from "../../data/catalogData";

const RecommendedSection = ({ products = null }) => {
  const recommended = useMemo(() => {
    if (Array.isArray(products) && products.length > 0) return products.slice(0, 10);
    return getRecommendedProducts(10);
  }, [products]);

  if (!recommended.length) return null;

  return (
    <div className="px-3 py-2 bg-gradient-to-br from-blue-50/60 via-white to-purple-50/40 rounded-xl mx-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-sm">
            <FiThumbsUp className="text-white" style={{ fontSize: 11 }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 leading-none">Recommended for You</h2>
            <p className="text-[9px] text-gray-500 mt-0.5">Curated just for you</p>
          </div>
        </div>
        <Link to="/search" className="flex items-center gap-0.5 text-[10px] text-primary-600 font-semibold hover:text-primary-700 transition-colors">
          <span>See All</span>
          <FiArrowRight style={{ fontSize: 10 }} />
        </Link>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
        {recommended.map((product) => (
          <div key={product.id} className="flex-shrink-0" style={{ width: "42vw", maxWidth: 180 }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedSection;
