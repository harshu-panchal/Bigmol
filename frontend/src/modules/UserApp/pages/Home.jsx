import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, matchPath, useNavigate } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import MobileLayout from "../components/Layout/MobileLayout";
import ProductCard from "../../../shared/components/ProductCard";
import AnimatedBanner from "../components/Mobile/AnimatedBanner";
import NewArrivalsSection from "../components/Mobile/NewArrivalsSection";
import DailyDealsSection from "../components/Mobile/DailyDealsSection";
import RecommendedSection from "../components/Mobile/RecommendedSection";
import FeaturedVendorsSection from "../components/Mobile/FeaturedVendorsSection";
import BrandLogosScroll from "../components/Mobile/BrandLogosScroll";
import MobileCategoryGrid from "../components/Mobile/MobileCategoryGrid";
import LazyImage from "../../../shared/components/LazyImage";
import {
  getMostPopular,
  getTrending,
  getFlashSale,
  getDailyDeals,
  getAllNewArrivals,
  getRecommendedProducts,
  getApprovedVendors,
  getCatalogBrands,
} from "../data/catalogData";
import PageTransition from "../../../shared/components/PageTransition";
import usePullToRefresh from "../hooks/usePullToRefresh";
import { useProducts, useVendors, useBrands, useBanners } from "../../../shared/hooks/useCatalog";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";

import heroSlide1 from "../../../../data/hero/slide1.png";
import heroSlide2 from "../../../../data/hero/slide2.png";
import heroSlide3 from "../../../../data/hero/slide3.png";
import heroSlide4 from "../../../../data/hero/slide4.png";
import stylishWatchImg from "../../../../data/products/stylish watch.png";

const normalizeId = (value) => String(value ?? "").trim();
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProduct = (raw) => {
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

  const id = normalizeId(raw?.id || raw?._id);
  const vendorId = normalizeId(vendorObj?._id || vendorObj?.id || raw?.vendorId);
  const brandId = normalizeId(brandObj?._id || brandObj?.id || raw?.brandId);
  const categoryId = normalizeId(
    categoryObj?._id || categoryObj?.id || raw?.categoryId
  );
  const image = raw?.image || raw?.images?.[0] || "";

  return {
    ...raw,
    id,
    _id: id,
    vendorId,
    vendorName: raw?.vendorName || vendorObj?.storeName || vendorObj?.name || "",
    brandId,
    brandName: raw?.brandName || brandObj?.name || "",
    categoryId,
    categoryName: raw?.categoryName || categoryObj?.name || "",
    image,
    images: Array.isArray(raw?.images) ? raw.images : image ? [image] : [],
    price: toNumber(raw?.price, 0),
    originalPrice:
      raw?.originalPrice !== undefined ? toNumber(raw.originalPrice, undefined) : undefined,
    rating: toNumber(raw?.rating, 0),
    reviewCount: toNumber(raw?.reviewCount, 0),
    isActive: raw?.isActive !== false,
    flashSale: !!raw?.flashSale,
    isNew: !!raw?.isNewArrival,
  };
};

const normalizeVendor = (raw) => ({
  ...raw,
  id: normalizeId(raw?.id || raw?._id),
  _id: normalizeId(raw?.id || raw?._id),
  isVerified: !!raw?.isVerified,
  rating: toNumber(raw?.rating, 0),
  reviewCount: toNumber(raw?.reviewCount, 0),
  status: raw?.status || "approved",
});

const normalizeBrand = (raw) => ({
  ...raw,
  id: normalizeId(raw?.id || raw?._id),
  _id: normalizeId(raw?.id || raw?._id),
  name: raw?.name || "",
  logo: raw?.logo || "",
});

const deriveDailyDeals = (products = []) => {
  const flash = products.filter((p) => p.flashSale);
  const discounted = products.filter(
    (p) =>
      p.originalPrice !== undefined &&
      toNumber(p.originalPrice, 0) > toNumber(p.price, 0) &&
      !p.flashSale
  );
  const merged = [...flash, ...discounted];
  return merged.filter(
    (p, index, arr) =>
      index === arr.findIndex((x) => normalizeId(x.id) === normalizeId(p.id))
  );
};

const DEFAULT_HERO_SLIDES = [
  { image: heroSlide1 },
  { image: heroSlide2 },
  { image: heroSlide3 },
  { image: heroSlide4 },
];

const extractResponseData = (response) => {
  if (response && typeof response === "object") {
    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }
    return response;
  }
  return null;
};

const asList = (value) => (Array.isArray(value) ? value : []);
const KNOWN_USER_ROUTE_PATTERNS = [
  "/",
  "/home",
  "/search",
  "/offers",
  "/daily-deals",
  "/flash-sale",
  "/new-arrivals",
  "/categories",
  "/category/:id",
  "/brand/:id",
  "/seller/:id",
  "/product/:id",
  "/sale/:slug",
  "/track-order/:orderId",
];

const getPathnameFromTarget = (target) =>
  String(target || "").trim().split("?")[0].split("#")[0];

const isKnownInternalRoute = (target) => {
  const pathname = getPathnameFromTarget(target);
  if (!pathname) return false;
  return KNOWN_USER_ROUTE_PATTERNS.some((pattern) =>
    !!matchPath({ path: pattern, end: true }, pathname)
  );
};

const resolveBannerLink = (banner) => {
  const candidate = String(
    banner?.linkUrl || banner?.link || banner?.url || ""
  ).trim();
  if (!candidate) return "";
  if (isExternalLink(candidate)) return candidate;
  if (isSafeInternalPath(candidate) && isKnownInternalRoute(candidate))
    return candidate;
  return "";
};

const isExternalLink = (target) => /^https?:\/\//i.test(String(target || "").trim());
const isSafeInternalPath = (target) => String(target || "").startsWith("/");

const MobileHome = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [autoSlidePaused, setAutoSlidePaused] = useState(false);
  const [isDraggingSlide, setIsDraggingSlide] = useState(false);
  const { data: productsData, refetch: refetchProducts } = useProducts({ page: 1, limit: 120 });
  const { data: vendorsData, refetch: refetchVendors } = useVendors({ status: "approved", page: 1, limit: 50 });
  const { data: brandsData, refetch: refetchBrands } = useBrands();
  const { data: bannersData, refetch: refetchBanners } = useBanners();

  const catalogProducts = useMemo(() => {
    const productsSource = asList(extractResponseData(productsData)?.products);
    return productsSource
      .map(normalizeProduct)
      .filter((product) => product.id && product.isActive !== false);
  }, [productsData]);

  const homeVendors = useMemo(() => {
    const vendorsSource = asList(extractResponseData(vendorsData)?.vendors);
    return vendorsSource
      .map(normalizeVendor)
      .filter((vendor) => vendor.id);
  }, [vendorsData]);

  const homeBrands = useMemo(() => {
    const brandsSource = asList(extractResponseData(brandsData));
    return brandsSource
      .map(normalizeBrand)
      .filter((brand) => brand.id);
  }, [brandsData]);

  const { slides, promoBanners, sideBanner } = useMemo(() => {
    const allBanners = asList(extractResponseData(bannersData)).filter(
      (banner) => banner?.image && banner?.isActive !== false
    );

    const bannerSlides = allBanners
      .filter((banner) => ["home_slider", "hero"].includes(String(banner?.type || "")))
      .sort((a, b) => toNumber(a.order, 0) - toNumber(b.order, 0))
      .map((banner, index) => ({
        id: normalizeId(banner._id || banner.id || `home-slide-${index}`),
        image: banner.image,
        link: resolveBannerLink(banner),
        title: banner.title || "",
      }));

    const promos = allBanners
      .filter((banner) => String(banner?.type || "") === "promotional")
      .sort((a, b) => toNumber(a.order, 0) - toNumber(b.order, 0))
      .map((banner, index) => ({
        id: normalizeId(banner._id || banner.id || `promo-banner-${index}`),
        title: banner.title || "Special Offer",
        subtitle: banner.subtitle || "Limited Time",
        description: banner.description || "",
        discount: banner.description || "Shop Now",
        link: resolveBannerLink(banner),
        image: banner.image,
        type: banner.type || "promotional",
      }));

    const side = allBanners
      .filter((banner) => String(banner?.type || "") === "side_banner")
      .sort((a, b) => toNumber(a.order, 0) - toNumber(b.order, 0))
      .map((banner, index) => ({
        id: normalizeId(banner._id || banner.id || `side-banner-${index}`),
        image: banner.image,
        title: banner.title || "PREMIUM",
        subtitle: banner.subtitle || "Exclusive Collection",
        link: resolveBannerLink(banner),
      }));

    return {
      slides: bannerSlides.length > 0 ? bannerSlides : DEFAULT_HERO_SLIDES,
      promoBanners: promos,
      sideBanner: side[0] || null,
    };
  }, [bannersData]);

  const fallbackMostPopular = getMostPopular();
  const fallbackTrending = getTrending();
  const fallbackFlashSale = getFlashSale();
  const fallbackNewArrivals = getAllNewArrivals().slice(0, 6);
  const fallbackDailyDeals = getDailyDeals().slice(0, 5);
  const fallbackRecommended = getRecommendedProducts(6);
  const fallbackVendors = getApprovedVendors();
  const fallbackBrands = getCatalogBrands().slice(0, 10);

  const computedNewArrivals = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackNewArrivals;
    return catalogProducts.filter((p) => p.isNew).slice(0, 6);
  }, [catalogProducts, fallbackNewArrivals]);

  const computedDailyDeals = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackDailyDeals;
    return deriveDailyDeals(catalogProducts).slice(0, 5);
  }, [catalogProducts, fallbackDailyDeals]);

  const computedRecommended = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackRecommended;
    return [...catalogProducts]
      .sort((a, b) => toNumber(b.rating, 0) - toNumber(a.rating, 0))
      .slice(0, 6);
  }, [catalogProducts, fallbackRecommended]);

  const computedMostPopular = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackMostPopular.slice(0, 6);
    return [...catalogProducts]
      .sort((a, b) => {
        const reviewsDiff = toNumber(b.reviewCount, 0) - toNumber(a.reviewCount, 0);
        if (reviewsDiff !== 0) return reviewsDiff;
        return toNumber(b.rating, 0) - toNumber(a.rating, 0);
      })
      .slice(0, 6);
  }, [catalogProducts, fallbackMostPopular]);

  const computedTrending = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackTrending.slice(0, 6);
    return [...catalogProducts]
      .sort((a, b) => {
        const ratingDiff = toNumber(b.rating, 0) - toNumber(a.rating, 0);
        if (ratingDiff !== 0) return ratingDiff;
        return toNumber(b.reviewCount, 0) - toNumber(a.reviewCount, 0);
      })
      .slice(0, 6);
  }, [catalogProducts, fallbackTrending]);

  const computedFlashSale = useMemo(() => {
    if (catalogProducts.length === 0) return fallbackFlashSale.slice(0, 6);
    return catalogProducts.filter((product) => product.flashSale).slice(0, 6);
  }, [catalogProducts, fallbackFlashSale]);

  const computedVendors = useMemo(() => {
    if (homeVendors.length === 0) return fallbackVendors;
    return [...homeVendors]
      .filter((vendor) => vendor.status === "approved")
      .sort((a, b) => toNumber(b.rating, 0) - toNumber(a.rating, 0))
      .slice(0, 10);
  }, [homeVendors, fallbackVendors]);

  const computedBrands = useMemo(() => {
    if (homeBrands.length === 0) return fallbackBrands;
    return homeBrands.slice(0, 10);
  }, [homeBrands, fallbackBrands]);

  const handleBannerNavigation = useCallback((link) => {
    if (!link) return;
    if (isExternalLink(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  }, [navigate]);

  const handleSlideClick = useCallback((slide) => {
    if (slide?.link) {
      handleBannerNavigation(slide.link);
    }
  }, [handleBannerNavigation]);

  const onTouchStart = useCallback((e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsDraggingSlide(true);
    setAutoSlidePaused(true);
  }, []);

  const onTouchMove = useCallback((e) => {
    if (touchStart === null) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    setDragOffset(touchStart - currentTouch);
  }, [touchStart]);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) {
      setDragOffset(0);
      setIsDraggingSlide(false);
      setAutoSlidePaused(false);
      return;
    }
    const distance = touchStart - touchEnd;
    if (distance > 50 && currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else if (distance < -50 && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
    setTouchStart(null);
    setTouchEnd(null);
    setDragOffset(0);
    setIsDraggingSlide(false);
    setAutoSlidePaused(false);
  }, [touchStart, touchEnd, currentSlide, slides.length]);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchProducts(),
        refetchVendors(),
        refetchBrands(),
        refetchBanners(),
      ]);
      toast.success("Refreshed");
    } catch (err) {
      toast.error("Refresh failed");
    }
  };


  const {
    pullDistance,
    isPulling,
    elementRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(handleRefresh);

  return (
    <PageTransition>
      <MobileLayout>
        <div
          ref={elementRef}
          className="w-full"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateY(${Math.min(pullDistance, 80)}px)`,
            transition: isPulling ? "none" : "transform 0.3s ease-out",
          }}>
          {/* Hero Banner */}
          <div className="px-3 pt-2 pb-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div
                className="relative w-full h-36 md:h-64 lg:h-[380px] xl:h-[420px] rounded-xl overflow-hidden lg:col-span-2"
                data-carousel
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{ touchAction: "pan-y", userSelect: "none" }}>
                {/* Slider Container - All slides in a row */}
                <motion.div
                  className="flex h-full"
                  style={{
                    width: `${slides.length * 100}%`,
                    height: "100%",
                  }}
                  animate={{
                    x:
                      dragOffset !== 0
                        ? `calc(-${currentSlide * (100 / slides.length)
                        }% - ${dragOffset}px)`
                        : `-${currentSlide * (100 / slides.length)}%`,
                  }}
                  transition={{
                    duration: dragOffset !== 0 ? 0 : 0.6,
                    ease: [0.25, 0.46, 0.45, 0.94], // Smooth easing
                    type: "tween",
                  }}>
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0"
                      onClick={() => handleSlideClick(slide)}
                      style={{
                        width: `${100 / slides.length}%`,
                        height: "100%",
                        cursor: slide?.link ? "pointer" : "default",
                      }}>
                      <LazyImage
                        src={slide.image}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/400x200?text=Slide+${index + 1
                            }`;
                        }}
                      />
                    </div>
                  ))}
                </motion.div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentSlide(index);
                        setAutoSlidePaused(true);
                        setTimeout(() => setAutoSlidePaused(false), 2000);
                      }}
                      className={`h-1 rounded-full transition-all pointer-events-auto ${index === currentSlide
                        ? "bg-white w-4"
                        : "bg-white/50 w-1"
                        }`}
                    />
                  ))}
                </div>
              </div>

              {/* Side Banner for Large Screens */}
              <div className="hidden lg:block lg:col-span-1 h-[400px] xl:h-[450px] rounded-2xl overflow-hidden relative bg-gray-900 group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-10" />
                <LazyImage
                  src={sideBanner?.image || stylishWatchImg}
                  alt={sideBanner?.title || "Premium Watch"}
                  className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-700"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/400x400?text=Premium+Watch";
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 p-8 z-20 flex flex-col items-center text-center">
                  <span className="text-yellow-400 font-bold text-3xl mb-2 tracking-wider drop-shadow-lg">
                    {sideBanner?.title || "PREMIUM"}
                  </span>
                  <p className="text-gray-300 text-sm mb-6 font-medium">
                    {sideBanner?.subtitle || "Exclusive Collection"}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleBannerNavigation(sideBanner?.link || "/offers")}
                    className="bg-white text-gray-900 font-bold py-3.5 px-10 rounded-xl w-full hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-xl uppercase tracking-widest text-sm"
                  >
                    Shop Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Logos Scroll */}
          <BrandLogosScroll brands={computedBrands} />

          {/* Categories */}
          <MobileCategoryGrid />

          {/* Featured Vendors Section */}
          <FeaturedVendorsSection vendors={computedVendors} />

          {/* Animated Banner */}
          <AnimatedBanner banners={promoBanners} />

          {/* New Arrivals */}
          <NewArrivalsSection products={computedNewArrivals} />



          {/* Most Popular */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-800">Most Popular</h2>
              <Link to="/search" className="text-[10px] text-primary-600 font-semibold">See All</Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
              {computedMostPopular.map((product) => (
                <div key={product.id} className="flex-shrink-0" style={{ width: "42vw", maxWidth: 180 }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          {/* Daily Deals */}
          <DailyDealsSection products={computedDailyDeals} />



          {/* Flash Sale */}
          {computedFlashSale.length > 0 && (
            <div className="px-3 py-2 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">⚡ Flash Sale</h2>
                  <p className="text-[9px] text-gray-500">Limited time offers</p>
                </div>
                <Link to="/flash-sale" className="text-[10px] text-primary-600 font-semibold">See All</Link>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
                {computedFlashSale.map((product) => (
                  <div key={product.id} className="flex-shrink-0" style={{ width: "42vw", maxWidth: 180 }}>
                    <ProductCard product={product} isFlashSale={true} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Items */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-800">🔥 Trending Now</h2>
              <Link to="/search" className="text-[10px] text-primary-600 font-semibold">See All</Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
              {computedTrending.map((product) => (
                <div key={product.id} className="flex-shrink-0" style={{ width: "42vw", maxWidth: 180 }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          {/* Recommended for You */}
          <RecommendedSection products={computedRecommended} />

          {/* Tagline Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="px-3 py-3 text-left">
            <motion.h2
              className="text-sm font-black text-gray-400 leading-tight flex items-center justify-start gap-1.5"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}>
              <span>Shop from 50+ Trusted Vendors</span>
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                className="text-primary-500 inline-block">
                <FiHeart className="text-base fill-primary-500" />
              </motion.span>
            </motion.h2>
          </motion.div>

          {/* Bottom Spacing */}
          <div className="h-4" />
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileHome;
