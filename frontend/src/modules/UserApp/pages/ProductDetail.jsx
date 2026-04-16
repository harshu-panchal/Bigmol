import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiStar,
  FiHeart,
  FiShoppingBag,
  FiMinus,
  FiPlus,
  FiArrowLeft,
  FiShare2,
  FiCheckCircle,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { useCartStore, useUIStore } from "../../../shared/store/useStore";
import { useWishlistStore } from "../../../shared/store/wishlistStore";
import { useReviewsStore } from "../../../shared/store/reviewsStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import { useAuthStore } from "../../../shared/store/authStore";
import {
  getProductById,
  getSimilarProducts,
  getVendorById,
  getBrandById,
} from "../data/catalogData";
import api from "../../../shared/utils/api";
import { formatPrice } from "../../../shared/utils/helpers";
import toast from "react-hot-toast";
import MobileLayout from "../components/Layout/MobileLayout";
import ImageGallery from "../../../shared/components/Product/ImageGallery";
import VariantSelector from "../../../shared/components/Product/VariantSelector";
import ReviewForm from "../../../shared/components/Product/ReviewForm";
import MobileProductCard from "../components/Mobile/MobileProductCard";
import PageTransition from "../../../shared/components/PageTransition";
import Badge from "../../../shared/components/Badge";
import ProductCard from "../../../shared/components/ProductCard";
import { getVariantSignature } from "../../../shared/utils/variant";

const resolveVariantPrice = (product, selectedVariant, isWholesaler = false) => {
  const basePrice = Number(isWholesaler && product?.wholesalePrice ? product.wholesalePrice : product?.price) || 0;
  if (!selectedVariant || (!product?.variants?.prices && !product?.variants?.wholesalePrices)) return basePrice;

  const retailEntries =
    product.variants.prices instanceof Map
      ? Array.from(product.variants.prices.entries())
      : Object.entries(product.variants.prices || {});

  const wholesaleEntries =
    product.variants.wholesalePrices instanceof Map
      ? Array.from(product.variants.wholesalePrices.entries())
      : Object.entries(product.variants.wholesalePrices || {});

  const targetEntries = isWholesaler && wholesaleEntries.length > 0 ? wholesaleEntries : retailEntries;

  const dynamicKey = getVariantSignature(selectedVariant || {});
  if (dynamicKey) {
    const direct = targetEntries.find(([key]) => String(key).trim() === dynamicKey);
    if (direct) {
      const parsed = Number(direct[1]);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    const normalized = targetEntries.find(
      ([key]) => String(key).trim().toLowerCase() === dynamicKey.toLowerCase()
    );
    if (normalized) {
      const parsed = Number(normalized[1]);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
  }

  const size = String(selectedVariant.size || "").trim().toLowerCase();
  const color = String(selectedVariant.color || "").trim().toLowerCase();

  const candidates = [
    `${size}|${color}`,
    `${size}-${color}`,
    `${size}_${color}`,
    `${size}:${color}`,
    size && !color ? size : null,
    color && !size ? color : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const exact = targetEntries.find(([key]) => String(key).trim() === candidate);
    if (exact) {
      const parsed = Number(exact[1]);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    const normalized = targetEntries.find(
      ([key]) => String(key).trim().toLowerCase() === candidate
    );
    if (normalized) {
      const parsed = Number(normalized[1]);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
  }

  return basePrice;
};

const isMongoId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));
const normalizeProduct = (raw) => {
  if (!raw) return null;

  const vendorObj =
    raw?.vendor && typeof raw.vendor === "object"
      ? raw.vendor
      : raw?.vendorId && typeof raw.vendorId === "object"
        ? raw.vendorId
        : null;
  const brandObj =
    raw?.brand && typeof raw.brand === "object"
      ? raw.brand
      : raw?.brandId && typeof raw.brandId === "object"
        ? raw.brandId
        : null;
  const categoryObj =
    raw?.category && typeof raw.category === "object"
      ? raw.category
      : raw?.categoryId && typeof raw.categoryId === "object"
        ? raw.categoryId
        : null;

  const id = String(raw?.id || raw?._id || "").trim();
  if (!id) return null;

  const vendorId = String(vendorObj?._id || vendorObj?.id || raw?.vendorId || "").trim();
  const brandId = String(brandObj?._id || brandObj?.id || raw?.brandId || "").trim();
  const categoryId = String(categoryObj?._id || categoryObj?.id || raw?.categoryId || "").trim();
  const image = raw?.image || raw?.images?.[0] || "";
  const images = Array.isArray(raw?.images) ? raw.images.filter(Boolean) : image ? [image] : [];

  return {
    ...raw,
    id,
    _id: id,
    vendorId,
    brandId,
    categoryId,
    image,
    images,
    price: Number(raw?.price) || 0,
    originalPrice:
      raw?.originalPrice !== undefined && raw?.originalPrice !== null
        ? Number(raw.originalPrice)
        : undefined,
    rating: Number(raw?.rating) || 0,
    reviewCount: Number(raw?.reviewCount) || 0,
    stockQuantity: Number(raw?.stockQuantity) || 0,
    vendorName: raw?.vendorName || vendorObj?.storeName || vendorObj?.name || "",
    brandName: raw?.brandName || brandObj?.name || "",
    categoryName: raw?.categoryName || categoryObj?.name || "",
    vendor: vendorObj
      ? {
        ...vendorObj,
        id: String(vendorObj?.id || vendorObj?._id || vendorId),
      }
      : null,
    brand: brandObj
      ? {
        ...brandObj,
        id: String(brandObj?.id || brandObj?._id || brandId),
      }
      : null,
    stock:
      raw?.stock ||
      (Number(raw?.stockQuantity) > 0 ? "in_stock" : "out_of_stock"),
    description: String(raw?.description || "").trim(),
  };
};

/* ── Brand avatar: show image only, hide silently on error ── */
const BrandAvatar = ({ logo, name }) => {
  const imgRef = useState(null);
  if (!logo) return null;
  return (
    <div className="w-4 h-4 rounded-full overflow-hidden bg-white border border-gray-200 flex-shrink-0">
      <img
        src={logo}
        alt={name}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Silently hide the entire parent avatar div — no re-render, no flicker
          const parent = e.currentTarget.parentElement;
          if (parent) parent.style.display = "none";
        }}
      />
    </div>
  );
};

/* ── Description block with Show More/Less ── */
const DescriptionBlock = ({ description, productName, unit }) => {
  const [expanded, setExpanded] = useState(false);
  const text = description
    ? description
    : `High-quality ${(productName || "").toLowerCase()} available in ${(unit || "").toLowerCase()}. This product is carefully selected to ensure the best quality and freshness.`;
  const LIMIT = 120;
  const isLong = text.length > LIMIT;

  return (
    <div className="pt-2">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Description</h3>
      <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
        <p className="text-[11px] text-gray-600 leading-relaxed">
          {isLong && !expanded ? `${text.slice(0, LIMIT)}…` : text}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 flex items-center gap-0.5 text-primary-600 text-[10px] font-semibold"
          >
            {expanded ? (
              <><FiChevronUp className="text-[10px]" /> Show Less</>
            ) : (
              <><FiChevronDown className="text-[10px]" /> Show More</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const MobileProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const localFallbackProduct = useMemo(() => normalizeProduct(getProductById(id)), [id]);
  const [product, setProduct] = useState(localFallbackProduct);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const { items, addItem, removeItem } = useCartStore();
  const triggerCartAnimation = useUIStore(
    (state) => state.triggerCartAnimation
  );
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isInWishlist,
  } = useWishlistStore();
  const { fetchReviews, sortReviews, addReview } = useReviewsStore();
  const { getAllOrders } = useOrderStore();
  const { user, isAuthenticated } = useAuthStore();
  const vendor = useMemo(() => {
    if (!product) return null;
    if (product.vendor?.id) return product.vendor;
    return getVendorById(product.vendorId);
  }, [product]);
  const brand = useMemo(() => {
    if (!product) return null;
    if (product.brand?.id) return product.brand;
    return getBrandById(product.brandId);
  }, [product]);

  const isFavorite = product ? isInWishlist(product.id) : false;
  const isWholesaler = user?.userType === "wholesaler";

  useEffect(() => {
    if (isWholesaler && product?.minWholesaleQty) {
      setQuantity(Math.max(1, product.minWholesaleQty));
    } else {
      setQuantity(1);
    }
  }, [isWholesaler, product?.minWholesaleQty]);
  const selectedVariantSignature = getVariantSignature(selectedVariant || {});
  const isInCart = product
    ? items.some(
      (item) =>
        String(item.id) === String(product.id) &&
        getVariantSignature(item.variant || {}) === selectedVariantSignature
    )
    : false;
  const productReviews = product ? sortReviews(product.id, "newest") : [];

  useEffect(() => {
    let active = true;
    setIsLoadingProduct(true);

    const loadProductDetail = async () => {
      try {
        const [detailRes, similarRes] = await Promise.allSettled([
          api.get(`/products/${id}`),
          api.get(`/similar/${id}`),
        ]);

        const detailPayload =
          detailRes.status === "fulfilled"
            ? detailRes.value?.data ?? detailRes.value
            : null;
        const resolvedProduct = normalizeProduct(detailPayload) || localFallbackProduct;

        const similarPayload =
          similarRes.status === "fulfilled"
            ? similarRes.value?.data ?? similarRes.value
            : null;
        const resolvedSimilar = Array.isArray(similarPayload)
          ? similarPayload
            .map(normalizeProduct)
            .filter(
              (item) => item?.id && String(item.id) !== String(resolvedProduct?.id || "")
            )
            .slice(0, 5)
          : [];

        if (!active) return;

        setProduct(resolvedProduct);
        if (resolvedSimilar.length > 0) {
          setSimilarProducts(resolvedSimilar);
        } else if (resolvedProduct?.id) {
          setSimilarProducts(getSimilarProducts(resolvedProduct.id, 5));
        } else {
          setSimilarProducts([]);
        }
      } catch {
        if (!active) return;
        setProduct(localFallbackProduct);
        setSimilarProducts(
          localFallbackProduct?.id ? getSimilarProducts(localFallbackProduct.id, 5) : []
        );
      } finally {
        if (active) setIsLoadingProduct(false);
      }
    };

    loadProductDetail();
    return () => {
      active = false;
    };
  }, [id, localFallbackProduct]);

  useEffect(() => {
    if (product?.variants?.defaultSelection && typeof product.variants.defaultSelection === "object") {
      setSelectedVariant(product.variants.defaultSelection);
      return;
    }
    if (product?.variants?.defaultVariant) {
      setSelectedVariant(product.variants.defaultVariant);
      return;
    }
    setSelectedVariant({});
  }, [product]);

  useEffect(() => {
    if (product?.id) {
      fetchReviews(product.id, { sort: "newest", limit: 50 });
    }
  }, [product?.id, fetchReviews]);

  if (!product) {
    return (
      <PageTransition>
        <MobileLayout showBottomNav={false} showCartBar={false}>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              {isLoadingProduct ? (
                <h2 className="text-xl font-bold text-gray-800 mb-4">Loading product...</h2>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Product Not Found
                  </h2>
                  <button
                    onClick={() => navigate("/home")}
                    className="gradient-green text-white px-6 py-3 rounded-xl font-semibold">
                    Go Back Home
                  </button>
                </>
              )}
            </div>
          </div>
        </MobileLayout>
      </PageTransition>
    );
  }

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock === "out_of_stock") {
      toast.error("Product is out of stock");
      return;
    }
    const attributeAxes = Array.isArray(product?.variants?.attributes)
      ? product.variants.attributes.filter((attr) => Array.isArray(attr?.values) && attr.values.length > 0)
      : [];
    const hasDynamicAxes = attributeAxes.length > 0;
    const hasSizeVariants = Array.isArray(product?.variants?.sizes) && product.variants.sizes.length > 0;
    const hasColorVariants = Array.isArray(product?.variants?.colors) && product.variants.colors.length > 0;
    const isMissingDynamicAxis = hasDynamicAxes
      ? attributeAxes.some((attr) => !String(selectedVariant?.[attr.name] || selectedVariant?.[String(attr.name || "").toLowerCase().replace(/\s+/g, "_")] || "").trim())
      : false;
    const selectedSize = String(selectedVariant?.size || "").trim();
    const selectedColor = String(selectedVariant?.color || "").trim();
    if (isMissingDynamicAxis || ((hasSizeVariants && !selectedSize) || (hasColorVariants && !selectedColor))) {
      toast.error("Please select required variant options");
      return;
    }

    const finalPrice = resolveVariantPrice(product, selectedVariant, isWholesaler);
    const variantKey = getVariantSignature(selectedVariant || {});
    const variantStockValue = Number(
      product?.variants?.stockMap?.[variantKey] ??
      product?.variants?.stockMap?.get?.(variantKey)
    );
    const effectiveStock = Number.isFinite(variantStockValue)
      ? variantStockValue
      : Number(product.stockQuantity || 0);
    if (effectiveStock <= 0) {
      toast.error("Selected variant is out of stock");
      return;
    }
    if (quantity > effectiveStock) {
      toast.error(`Only ${effectiveStock} item(s) available for selected variant`);
      return;
    }

    const addedToCart = addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      isWholesale: isWholesaler && (!!product.wholesalePrice || (Array.isArray(product?.variants?.wholesalePrices) ? product.variants.wholesalePrices.length > 0 : !!product?.variants?.wholesalePrices)),
      image: product.image,
      quantity: quantity,
      variant: selectedVariant,
      stockQuantity: effectiveStock,
      vendorId: product.vendorId,
      vendorName: vendor?.storeName || vendor?.name || product.vendorName,
    });
    if (!addedToCart) return;
    triggerCartAnimation();
    toast.success("Added to cart!");
  };

  const handleRemoveFromCart = () => {
    if (!product) return;
    removeItem(product.id, selectedVariant || {});
    toast.success("Removed from cart!");
  };

  const handleFavorite = () => {
    if (!product) return;
    if (isFavorite) {
      removeFromWishlist(product.id);
      toast.success("Removed from wishlist");
    } else {
      const addedToWishlist = addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      });
      if (addedToWishlist) {
        toast.success("Added to wishlist");
      }
    }
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    const minQty = isWholesaler && product?.minWholesaleQty ? product.minWholesaleQty : 1;
    const variantKey = getVariantSignature(selectedVariant || {});
    const variantStockValue = Number(
      product?.variants?.stockMap?.[variantKey] ??
      product?.variants?.stockMap?.get?.(variantKey)
    );
    const maxStock = Number.isFinite(variantStockValue)
      ? Math.max(0, variantStockValue)
      : Number(product?.stockQuantity || 0);
    if (newQuantity >= minQty && newQuantity <= (maxStock || 10)) {
      setQuantity(newQuantity);
    }
  };

  const productImages = useMemo(() => {
    if (!product) return [];
    const selectedVariantKey = getVariantSignature(selectedVariant || {});
    const variantImage = String(
      product?.variants?.imageMap?.[selectedVariantKey] ||
      product?.variants?.imageMap?.get?.(selectedVariantKey) ||
      ""
    ).trim();
    const images =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images.filter(Boolean)
        : product.image
          ? [product.image]
          : [];
    if (variantImage) {
      return [variantImage, ...images.filter((img) => img !== variantImage)];
    }
    return images;
  }, [product, selectedVariant]);

  const currentPrice = useMemo(() => {
    return resolveVariantPrice(product, selectedVariant, isWholesaler);
  }, [product, selectedVariant, isWholesaler]);

  const selectedAvailableStock = useMemo(() => {
    const variantKey = getVariantSignature(selectedVariant || {});
    const variantStockValue = Number(
      product?.variants?.stockMap?.[variantKey] ??
      product?.variants?.stockMap?.get?.(variantKey)
    );
    if (Number.isFinite(variantStockValue)) {
      return Math.max(0, variantStockValue);
    }
    return Number(product?.stockQuantity || 0);
  }, [product, selectedVariant]);

  const productFaqs = useMemo(() => {
    if (!Array.isArray(product?.faqs)) return [];
    return product.faqs
      .map((faq) => ({
        question: String(faq?.question || "").trim(),
        answer: String(faq?.answer || "").trim(),
      }))
      .filter((faq) => faq.question && faq.answer);
  }, [product?.faqs]);

  const eligibleDeliveredOrderId = useMemo(() => {
    if (!isAuthenticated || !user?.id || !isMongoId(product?.id)) return null;
    const userOrders = getAllOrders(user.id) || [];
    const eligibleOrder = userOrders.find((order) => {
      if (String(order?.status || "").toLowerCase() !== "delivered") return false;
      const items = Array.isArray(order?.items) ? order.items : [];
      return items.some(
        (item) => String(item?.productId || item?.id || "") === String(product.id)
      );
    });
    return eligibleOrder?._id || null;
  }, [isAuthenticated, user?.id, product?.id, getAllOrders]);

  const handleSubmitReview = async (reviewData) => {
    if (!eligibleDeliveredOrderId) {
      toast.error("You can review only after this product is delivered");
      return false;
    }

    const ok = await addReview(product.id, {
      ...reviewData,
      orderId: eligibleDeliveredOrderId,
    });
    if (!ok) {
      toast.error("Unable to submit review");
      return false;
    }

    await fetchReviews(product.id, { sort: "newest", limit: 50 });
    return true;
  };

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={false}>
        <div className="w-full pb-20 max-w-7xl mx-auto">

          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-16 lg:px-8 lg:items-start">
            {/* Left Column: Product Image — full bleed, no card wrapper */}
            <div className="lg:p-0 lg:sticky lg:top-24">
              <ImageGallery images={productImages} productName={product.name} />
              {product.flashSale && (
                <div className="mt-2 flex justify-center lg:justify-start px-3">
                  <Badge variant="flash" size="sm">Flash Sale - Limited Time</Badge>
                </div>
              )}
            </div>

            {/* Right Column: Product Info */}
            <div className="px-3 py-2 lg:p-0">
              <div className="flex flex-col gap-3">
                <div>
                  {/* Vendor + Brand badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {vendor && (
                      <Link
                        to={`/seller/${vendor.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-full transition-all border border-gray-200 group"
                      >
                        {vendor.storeLogo ? (
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                            <img src={vendor.storeLogo} alt={vendor.storeName || vendor.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                            <FiShoppingBag className="text-white" style={{ fontSize: 8 }} />
                          </div>
                        )}
                        <span className="font-medium text-[10px] group-hover:text-primary-600 transition-colors">{vendor.storeName || vendor.name}</span>
                        {vendor.isVerified && <FiCheckCircle className="text-accent-500" style={{ fontSize: 9 }} title="Verified" />}
                        <span className="text-gray-400 text-[9px] group-hover:translate-x-0.5 transition-transform">{"->"}</span>
                      </Link>
                    )}
                    {brand && (
                      <Link
                        to={`/brand/${brand.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-full transition-all border border-gray-200 group"
                      >
                        <BrandAvatar logo={brand.logo} name={brand.name} />
                        <span className="font-medium text-[10px] group-hover:text-primary-600 transition-colors">{brand.name}</span>
                        <span className="text-gray-400 text-[9px] group-hover:translate-x-0.5 transition-transform">{"->"}</span>
                      </Link>
                    )}
                  </div>

                  <h1 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">
                    {product.name}
                  </h1>

                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
                        <span className="font-bold text-yellow-700 text-[10px]">{product.rating}</span>
                        <FiStar className="text-yellow-500 fill-yellow-500" style={{ fontSize: 9 }} />
                      </div>
                      <span className="text-gray-500 text-[10px] font-medium">{product.reviewCount || 0} Reviews</span>
                      <span className="text-gray-300 text-[9px]">|</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                        product.stock === "in_stock" ? "text-green-700 bg-green-50" :
                        product.stock === "low_stock" ? "text-orange-700 bg-orange-50" :
                        "text-red-700 bg-red-50"
                      }`}>
                        {product.stock === "in_stock" ? "In Stock" : product.stock === "low_stock" ? "Low Stock" : "Out of Stock"}
                      </span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 border border-gray-100">
                    <div className="flex items-end gap-2 mb-0.5">
                      <span className="text-xl font-extrabold text-gray-900">
                        {formatPrice(currentPrice)}
                        {isWholesaler && product.wholesalePrice && <span className="text-[10px] text-primary-600 block leading-tight font-bold">(Wholesale Price)</span>}
                      </span>
                      {product.originalPrice && product.originalPrice > currentPrice && (
                        <span className="text-sm text-gray-400 line-through font-medium mb-0.5 mt-auto">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>
                    {product.originalPrice && product.originalPrice > currentPrice && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-accent-600 font-bold bg-accent-50 px-2 py-0.5 rounded-full text-[9px]">
                          {Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)}% OFF
                        </span>
                        <span className="text-[10px] text-gray-500">Best price guaranteed</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Variants & Quantity */}
                <div className="space-y-3 border-b border-gray-100 pb-4">
                  {product.variants && (
                    <VariantSelector
                      variants={product.variants}
                      onVariantChange={setSelectedVariant}
                      currentPrice={product.price}
                    />
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex-shrink-0">Qty</span>
                    <div className="flex items-center bg-gray-100 rounded-md p-0.5 border border-gray-200">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= (isWholesaler && product?.minWholesaleQty ? product.minWholesaleQty : 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm disabled:shadow-none disabled:bg-transparent disabled:opacity-40 transition-all text-gray-600"
                      >
                        <FiMinus style={{ fontSize: 9 }} />
                      </button>
                      <span className="w-6 text-center font-bold text-gray-900 text-xs">{quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= (selectedAvailableStock || 10)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm disabled:shadow-none disabled:bg-transparent disabled:opacity-40 transition-all text-gray-600"
                      >
                        <FiPlus style={{ fontSize: 9 }} />
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-400">{selectedAvailableStock} {product.unit}s left</span>
                  </div>
                </div>

                {/* DESKTOP ACTIONS */}
                <div className="hidden lg:grid grid-cols-5 gap-4 py-4">
                  {isInCart ? (
                    <button
                      onClick={handleRemoveFromCart}
                      className="col-span-3 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100">
                      <FiTrash2 className="text-xl" />
                      <span>Remove from Cart</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      disabled={product.stock === "out_of_stock"}
                      className={`col-span-3 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${product.stock === "out_of_stock"
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        : "gradient-green text-white hover:shadow-glow-green hover:-translate-y-0.5"
                        }`}>
                      <FiShoppingBag className="text-xl" />
                      <span>
                        {product.stock === "out_of_stock"
                          ? "Out of Stock"
                          : "Add to Cart"}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={handleFavorite}
                    className={`col-span-1 py-4 rounded-xl font-semibold transition-all duration-300 border-2 flex items-center justify-center ${isFavorite
                      ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}>
                    <FiHeart
                      className={`text-2xl ${isFavorite ? "fill-current" : ""}`}
                    />
                  </button>

                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: product.name,
                          text: `Check out ${product.name}`,
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Link copied to clipboard");
                      }
                    }}
                    className="col-span-1 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl font-semibold transition-all duration-300 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center">
                    <FiShare2 className="text-2xl" />
                  </button>
                </div>

                {/* Description with Show More */}
                <DescriptionBlock description={product.description} productName={product.name} unit={product.unit} />

                {/* FAQs */}
                {productFaqs.length > 0 && (
                  <div className="pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Product FAQs
                    </h3>
                    <div className="space-y-3">
                      {productFaqs.map((faq, index) => (
                        <div
                          key={`${faq.question}-${index}`}
                          className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
                        >
                          <p className="text-sm font-bold text-gray-800 mb-2">
                            {faq.question}
                          </p>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Write Review */}
                {isAuthenticated && isMongoId(product?.id) && (
                  <div className="pt-6">
                    {eligibleDeliveredOrderId ? (
                      <ReviewForm
                        productId={product.id}
                        onSubmit={handleSubmitReview}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-600">
                        Reviews are available after product delivery.
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews List */}
                {productReviews.length > 0 && (
                  <div className="pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Customer Reviews ({productReviews.length})
                    </h3>
                    <div className="space-y-4">
                      {productReviews.slice(0, 3).map((review) => (
                        <div key={review.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                                {review.user.charAt(0)}
                              </div>
                              <span className="text-sm font-bold text-gray-900">
                                {review.user}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-sm text-gray-700">{review.rating}</span>
                              <FiStar className="text-yellow-400 fill-yellow-400 text-sm" />
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed pl-10">{review.comment}</p>
                          {review.vendorResponse && (
                            <div className="mt-3 ml-10 bg-primary-50 border border-primary-100 rounded-lg p-3">
                              <p className="text-xs font-semibold text-primary-700 mb-1">
                                Vendor Response
                              </p>
                              <p className="text-sm text-primary-800">{review.vendorResponse}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Similar Products — horizontal scroller */}
          {similarProducts.length > 0 && (
            <div className="px-3 pt-3 pb-1 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">You May Also Like</h3>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                {similarProducts.map((sp) => (
                  <div key={sp.id} className="flex-shrink-0" style={{ width: "42vw", maxWidth: 180 }}>
                    <ProductCard product={sp} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Fixed Bottom Action Bar (Mobile) ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2.5 z-[9990] shadow-[0_-4px_12px_rgba(0,0,0,0.07)]">
          <div className="flex items-center gap-2">
            {/* Wishlist */}
            <button
              onClick={handleFavorite}
              className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center border-2 transition-all ${
                isFavorite ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              <FiHeart className={`text-lg ${isFavorite ? "fill-red-600" : ""}`} />
            </button>
            {/* Share */}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, text: `Check out ${product.name}`, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied!");
                }
              }}
              className="w-10 h-10 flex-shrink-0 bg-gray-50 text-gray-600 border-2 border-gray-200 rounded-xl flex items-center justify-center transition-all"
            >
              <FiShare2 className="text-lg" />
            </button>
            {/* Add to Cart */}
            {isInCart ? (
              <button
                onClick={handleRemoveFromCart}
                className="flex-1 h-10 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-100"
              >
                <FiTrash2 className="text-sm" />
                Remove
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={product.stock === "out_of_stock"}
                className={`flex-1 h-10 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                  product.stock === "out_of_stock"
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "gradient-green text-white"
                }`}
              >
                <FiShoppingBag className="text-sm" />
                {product.stock === "out_of_stock" ? "Out of Stock" : "Add to Cart"}
              </button>
            )}
          </div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileProductDetail;
