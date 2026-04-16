import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiShoppingBag, FiHeart, FiTrash2 } from "react-icons/fi";
import { useCartStore, useUIStore } from "../../../../shared/store/useStore";
import { useAuthStore } from "../../../../shared/store/authStore";
import { useWishlistStore } from "../../../../shared/store/wishlistStore";
import { formatPrice } from "../../../../shared/utils/helpers";
import toast from "react-hot-toast";
import LazyImage from "../../../../shared/components/LazyImage";
import { getVariantSignature } from "../../../../shared/utils/variant";

const ProductListItem = ({ product, index, isFlashSale = false }) => {
  const navigate = useNavigate();
  const productLink = `/product/${product.id}`;
  const { items, addItem, removeItem } = useCartStore();
  const triggerCartAnimation = useUIStore((state) => state.triggerCartAnimation);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();

  const { user } = useAuthStore();
  const isWholesaler = user?.userType === 'wholesaler';
  const displayPrice = isWholesaler && product.wholesalePrice ? product.wholesalePrice : product.price;

  const hasNoVariant = (cartItem) => !getVariantSignature(cartItem?.variant || {});
  const isFavorite = isInWishlist(product.id);
  const isInCart = items.some((item) => item.id === product.id && hasNoVariant(item));

  const handleAddToCart = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    const hasDynamicAxes = Array.isArray(product?.variants?.attributes) && product.variants.attributes.some((a) => Array.isArray(a?.values) && a.values.length > 0);
    const hasSizeVariants = Array.isArray(product?.variants?.sizes) && product.variants.sizes.length > 0;
    const hasColorVariants = Array.isArray(product?.variants?.colors) && product.variants.colors.length > 0;
    if (hasDynamicAxes || hasSizeVariants || hasColorVariants) {
      toast.error("Please select variant on product page");
      navigate(productLink);
      return;
    }
    const added = addItem({ 
      id: product.id, 
      name: product.name, 
      price: displayPrice, 
      isWholesale: isWholesaler && !!product.wholesalePrice,
      image: product.image, 
      quantity: isWholesaler && product.minWholesaleQty ? Math.max(1, product.minWholesaleQty) : 1, 
      stockQuantity: product.stockQuantity, 
      vendorId: product.vendorId, 
      vendorName: product.vendorName 
    });
    if (!added) return;
    triggerCartAnimation();
  };

  const handleRemoveFromCart = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    removeItem(product.id, {});
    toast.success("Removed from cart!");
  };

  const handleFavorite = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    if (isFavorite) {
      removeFromWishlist(product.id);
      toast.success("Removed from wishlist");
    } else {
      const added = addToWishlist({ 
        id: product.id, 
        name: product.name, 
        price: displayPrice, 
        isWholesale: isWholesaler && !!product.wholesalePrice,
        image: product.image 
      });
      if (added) toast.success("Added to wishlist");
    }
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white rounded-xl mb-2 border border-gray-100 shadow-sm overflow-hidden ${isFlashSale ? "border-red-100" : ""}`}
    >
      <div className="flex gap-0">
        {/* ── Image — full cover, no padding ── */}
        <Link to={productLink} className="flex-shrink-0 relative">
          <div className="w-[90px] h-[90px] overflow-hidden bg-gray-50">
            <LazyImage
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = "https://via.placeholder.com/200x200?text=Product"; }}
            />
          </div>
          {/* Discount badge */}
          {discount > 0 && (
            <div className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded-md leading-none">
              {discount}% OFF
            </div>
          )}
        </Link>

        {/* ── Info ── */}
        <div className="flex-1 min-w-0 flex flex-col px-2.5 py-2">
          {/* Name + Wishlist */}
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <Link to={productLink} className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-[11px] line-clamp-2 leading-snug">
                {product.name}
              </h3>
            </Link>
            <button
              onClick={handleFavorite}
              className={`flex-shrink-0 p-1 rounded-full transition-all ${isFavorite ? "text-red-500" : "text-gray-300"}`}
            >
              <FiHeart className={`text-xs ${isFavorite ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* Rating + Unit */}
          <div className="flex items-center gap-1.5 mb-1">
            {product.rating > 0 && (
              <div className="flex items-center bg-yellow-50 px-1 py-0.5 rounded">
                <span className="text-[9px] font-bold text-yellow-700">⭐ {product.rating}</span>
                {product.reviewCount > 0 && (
                  <span className="text-[8px] text-gray-400 ml-0.5">({product.reviewCount})</span>
                )}
              </div>
            )}
            <span className="text-[9px] text-gray-400">{product.unit}</span>
          </div>

          {/* Flash sale bar */}
          {isFlashSale && (
            <div className="mb-1">
              <div className="h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 w-3/4" />
              </div>
            </div>
          )}

          {/* Price + Button */}
          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-gray-900">
                  {formatPrice(displayPrice)}
                </span>
                {product.originalPrice && product.originalPrice > displayPrice && (
                  <span className="text-[9px] text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              {isWholesaler && product.wholesalePrice && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[7px] font-black bg-blue-50 text-blue-600 px-1 py-0.5 rounded uppercase tracking-tighter border border-blue-100">Wholesale Rate</span>
                  <span className="text-[7px] text-gray-400 font-medium">Min: {product.minWholesaleQty || 1}</span>
                </div>
              )}
            </div>

            {isInCart ? (
              <button
                type="button"
                onClick={handleRemoveFromCart}
                className="px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 bg-red-50 text-red-600 border border-red-100 active:scale-95 transition-all"
              >
                <FiTrash2 style={{ fontSize: 9 }} />
                Remove
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-all ${isFlashSale ? "bg-gradient-to-r from-red-500 to-orange-500 text-white" : "gradient-green text-white"}`}
              >
                <FiShoppingBag style={{ fontSize: 9 }} />
                Add
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductListItem;
