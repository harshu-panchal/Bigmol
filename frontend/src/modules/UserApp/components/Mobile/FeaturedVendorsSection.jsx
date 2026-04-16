import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import VendorShowcaseCard from './VendorShowcaseCard';
import { getApprovedVendors } from '../../data/catalogData';

const FeaturedVendorsSection = ({ vendors = null }) => {
  const approvedVendors = Array.isArray(vendors) && vendors.length > 0
    ? vendors
    : getApprovedVendors();
  const featuredVendors = approvedVendors
    .filter(v => v.isVerified)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

  if (featuredVendors.length === 0) return null;

  return (
    <div className="px-3 py-2.5">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-bold text-gray-800 leading-none">Best Sellers</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">Shop from trusted stores</p>
        </div>
        <Link
          to="/search"
          className="flex items-center gap-0.5 text-[10px] text-primary-600 font-semibold hover:text-primary-700 transition-colors"
        >
          <span>See All</span>
          <FiArrowRight style={{ fontSize: 10 }} />
        </Link>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
        {featuredVendors.map((vendor, index) => (
          <VendorShowcaseCard key={vendor.id} vendor={vendor} index={index} />
        ))}
      </div>
    </div>
  );
};

export default FeaturedVendorsSection;
