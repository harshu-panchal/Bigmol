import { FiHeart, FiShoppingBag, FiStar, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore, useUIStore } from "../store/useStore";
import { useAuthStore } from "../store/authStore";
import { useWishlistStore } from "../store/wishlistStore";
import { formatPrice, getPlaceholderImage } from "../utils/helpers";
import toast from "react-hot-toast";
import LazyImage from "./LazyImage";
import { useState, useRef } from "react";
import useLongPress from "../../modules/UserApp/hooks/useLongPress";
import LongPressMenu from "../../modules/UserApp/components/Mobile/LongPressMenu";
import FlyingItem from "../../modules/UserApp/components/Mobile/FlyingItem";
import { getVariantSignature } from "../utils/variant";

const ProductCard = ({ product, hideRating = false, isFlashSale = false }) => {
  const navigate = useNavigate();
  const productLink = `/product/${product.id}`;
  const { items, addItem, removeItem } = useCartStore();
  const { user } = useAuthStore();
  const triggerCartAnimation = useUIStore((state) => state.triggerCartAnimation);
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();
  
  const isWholesaler = user?.userType === 'wholesaler';
  const displayPrice = isWholesaler && product.wholesalePrice ? product.wholesalePrice : product.price;

  const hasNoVariant = (cartItem) => !getVariantSignature(cartItem?.variant || {});
  const isFavorite = isInWishlist(product.id);
  const isInCart = items.some((item) => item.id === product.id && hasNoVariant(item));
  const [isAdding, setIsAdding] = useState(false);
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showFlyingItem, setShowFlyingItem] = useState(false);
  const [flyingItemPos, setFlyingItemPos] = useState({
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  });
  const buttonRef = useRef(null);

  const discountPercent =
    product.originalPrice && product.originalPrice > displayPrice
      ? Math.round(((product.originalPrice - displayPrice) / product.originalPrice) * 100)
      : null;

  const handleAddToCart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const hasDynamicAxes =
      Array.isArray(product?.variants?.attributes) &&
      product.variants.attributes.some((attr) => Array.isArray(attr?.values) && attr.values.length > 0);
    const hasSizeVariants = Array.isArray(product?.variants?.sizes) && product.variants.sizes.length > 0;
    const hasColorVariants = Array.isArray(product?.variants?.colors) && product.variants.colors.length > 0;
    if (hasDynamicAxes || hasSizeVariants || hasColorVariants) {
      toast.error("Please select variant on product page");
      navigate(productLink);
      return;
    }

    const isLargeScreen = window.innerWidth >= 1024;
    if (!isLargeScreen) {
      setIsAdding(true);
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      const startX = buttonRect ? buttonRect.left + buttonRect.width / 2 : 0;
      const startY = buttonRect ? buttonRect.top + buttonRect.height / 2 : 0;
      setTimeout(() => {
        const cartBar = document.querySelector("[data-cart-bar]");
        let endX = window.innerWidth / 2;
        let endY = window.innerHeight - 100;
        if (cartBar) {
          const cartRect = cartBar.getBoundingClientRect();
          endX = cartRect.left + cartRect.width / 2;
          endY = cartRect.top + cartRect.height / 2;
        } else {
          const cartIcon = document.querySelector("[data-cart-icon]");
          if (cartIcon) {
            const cartRect = cartIcon.getBoundingClientRect();
            endX = cartRect.left + cartRect.width / 2;
            endY = cartRect.top + cartRect.height / 2;
          }
        }
        setFlyingItemPos({ start: { x: startX, y: startY }, end: { x: endX, y: endY } });
        setShowFlyingItem(true);
      }, 50);
      setTimeout(() => setIsAdding(false), 600);
    }

    const addedToCart = addItem({
      id: product.id,
      name: product.name,
      price: displayPrice,
      isWholesale: isWholesaler && !!product.wholesalePrice,
      image: product.image,
      quantity: isWholesaler && product.minWholesaleQty ? Math.max(1, product.minWholesaleQty) : 1,
      stockQuantity: product.stockQuantity,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
    });
    if (!addedToCart) return;
    triggerCartAnimation();
    toast.success("Added to cart!");
  };

  const handleRemoveFromCart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    removeItem(product.id, {});
    toast.success("Removed from cart!");
  };

  const handleLongPress = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setShowLongPressMenu(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, text: `Check out ${product.name}`, url: window.location.origin + productLink });
    } else {
      navigator.clipboard.writeText(window.location.origin + productLink);
      toast.success("Link copied to clipboard");
    }
  };

  const longPressHandlers = useLongPress(handleLongPress, 500);

  const handleFavorite = (e) => {
    e.stopPropagation();
    if (isFavorite) {
      removeFromWishlist(product.id);
      toast.success("Removed from wishlist");
    } else {
      const addedToWishlist = addToWishlist({
        id: product.id,
        name: product.name,
        price: displayPrice,
        isWholesale: isWholesaler && !!product.wholesalePrice,
        image: product.image,
      });
      if (addedToWishlist) toast.success("Added to wishlist");
    }
  };

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
        style={{ willChange: "transform", transform: "translateZ(0)" }}
        className={`bg-white rounded-xl overflow-hidden cursor-pointer h-full flex flex-col transition-all duration-300 shadow-sm border border-gray-100 ${isFlashSale ? "border-red-100" : ""}`}
        {...longPressHandlers}
      >
        {/* ── Image Area ── */}
        <Link to={productLink} className="block relative">
          <div className="w-full aspect-square overflow-hidden bg-gray-50 relative">
            <LazyImage
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              style={{ willChange: "transform" }}
              onError={(e) => { e.target.src = getPlaceholderImage(300, 300, "Product Image"); }}
            />

            {/* Discount Badge — top-left */}
            {discountPercent && (
              <div
                className={`absolute top-1.5 left-1.5 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm ${
                  isFlashSale
                    ? "bg-gradient-to-r from-red-600 to-orange-500"
                    : "bg-red-500"
                }`}
              >
                {discountPercent}% OFF
              </div>
            )}

            {/* Flash Sale "Hot Deal" pill */}
            {isFlashSale && (
              <div className="absolute top-1.5 right-8 bg-yellow-400 text-gray-900 text-[7px] font-black px-1 py-0.5 rounded-full animate-pulse uppercase tracking-tighter">
                Hot
              </div>
            )}

            {/* Wishlist Button — top-right */}
            <button
              onClick={handleFavorite}
              className="absolute top-1.5 right-1.5 p-1 bg-white/80 backdrop-blur-sm rounded-full shadow transition-all duration-200 hover:bg-white hover:scale-110"
            >
              <FiHeart
                className={`text-[11px] transition-all duration-200 ${
                  isFavorite ? "text-red-500 fill-red-500" : "text-gray-400"
                }`}
              />
            </button>

            {/* Rating overlay on image — bottom-left */}
            {product.rating && !hideRating && (
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-px rounded-full shadow-sm">
                <FiStar className="text-[8px] text-yellow-500 fill-yellow-500" />
                <span className="text-[8px] font-bold text-gray-700">{product.rating}</span>
              </div>
            )}
          </div>
        </Link>

        {/* ── Info Area ── */}
        <div className="px-2 pt-1.5 pb-2 flex flex-col flex-1 gap-0.5">
          {/* Category / Unit chip */}
          {(product.category || product.unit) && (
            <span className="inline-block text-[8px] font-semibold text-primary-600 bg-primary-50 border border-primary-100 px-1.5 py-px rounded-full uppercase tracking-wide leading-tight w-fit">
              {product.category || product.unit}
            </span>
          )}

          {/* Product Name */}
          <Link to={productLink}>
            <h3 className="font-semibold text-gray-800 text-[10px] leading-tight line-clamp-2 hover:text-primary-600 transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Flash Sale progress */}
          {isFlashSale && (
            <div className="space-y-0.5">
              <div className="flex justify-between text-[7px] font-bold">
                <span className="text-gray-500 uppercase">Available</span>
                <span className="text-orange-600">
                  {Math.min(95, Math.floor(100 - (product.stockQuantity / 2)))}% Sold
                </span>
              </div>
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(95, Math.floor(100 - (product.stockQuantity / 2)))}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-red-500 to-orange-400"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col mt-auto">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] font-extrabold ${isFlashSale ? "text-red-600" : "text-gray-900"}`}>
                {formatPrice(displayPrice)}
              </span>
              {product.originalPrice && product.originalPrice > displayPrice && (
                <span className="text-[8px] text-gray-400 line-through font-medium">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              {discountPercent && (
                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-md ${isFlashSale ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            {isWholesaler && product.wholesalePrice && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[7.5px] font-black bg-blue-50 text-blue-600 px-1.5 py-px rounded uppercase tracking-tighter">Wholesale Rate</span>
                <span className="text-[7.5px] text-gray-400 font-medium">Min Qty: {product.minWholesaleQty || 1}</span>
              </div>
            )}
          </div>

          {/* Add / Remove Button */}
          {isInCart ? (
            <motion.button
              type="button"
              onClick={handleRemoveFromCart}
              whileTap={{ scale: 0.95 }}
              className="w-full py-1 rounded-lg font-bold text-[9px] bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all duration-200 flex items-center justify-center gap-1"
            >
              <FiTrash2 className="text-[9px]" />
              Remove
            </motion.button>
          ) : (
            <motion.button
              ref={buttonRef}
              type="button"
              onClick={handleAddToCart}
              disabled={product.stock === "out_of_stock" || isAdding}
              whileTap={{ scale: 0.95 }}
              animate={isAdding ? { scale: [1, 1.06, 1] } : {}}
              style={{ willChange: "transform" }}
              className={`w-full py-1 rounded-lg font-bold text-[9px] transition-all duration-200 flex items-center justify-center gap-1 ${
                product.stock === "out_of_stock"
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : isFlashSale
                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm"
                  : "gradient-green text-white shadow-sm"
              }`}
            >
              <motion.div
                animate={isAdding ? { rotate: [0, -10, 10, -10, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                <FiShoppingBag className="text-[9px]" />
              </motion.div>
              <span>
                {product.stock === "out_of_stock"
                  ? "Out of Stock"
                  : isAdding
                  ? "Adding…"
                  : "Add"}
              </span>
            </motion.button>
          )}
        </div>
      </motion.div>

      <LongPressMenu
        isOpen={showLongPressMenu}
        onClose={() => setShowLongPressMenu(false)}
        position={menuPosition}
        onAddToCart={handleAddToCart}
        onAddToWishlist={handleFavorite}
        onShare={handleShare}
        isInWishlist={isFavorite}
      />

      {showFlyingItem && (
        <FlyingItem
          image={product.image}
          startPosition={flyingItemPos.start}
          endPosition={flyingItemPos.end}
          onComplete={() => setShowFlyingItem(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
