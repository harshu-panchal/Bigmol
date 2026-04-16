import { useState } from "react";
import { FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LazyImage from "../LazyImage";
import useSwipeGesture from "../../../modules/UserApp/hooks/useSwipeGesture";

const ImageGallery = ({ images, productName = "Product", children }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const imageArray =
    Array.isArray(images) && images.length > 0
      ? images
      : [images].filter(Boolean);

  if (imageArray.length === 0) {
    return (
      <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <p className="text-gray-400 text-sm">No image available</p>
      </div>
    );
  }

  const handleNext = () => setSelectedIndex((p) => (p + 1) % imageArray.length);
  const handlePrevious = () => setSelectedIndex((p) => (p - 1 + imageArray.length) % imageArray.length);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
    threshold: 40,
  });

  return (
    <>
      <div className="w-full flex flex-col">
        {/* ── Main Image — full-bleed, no card, object-cover ── */}
        <div
          className="relative w-full overflow-hidden bg-gray-50"
          style={{ aspectRatio: "1 / 1" }}
          data-gallery
        >
          <motion.div
            key={selectedIndex}
            className="w-full h-full cursor-pointer"
            onClick={() => setIsLightboxOpen(true)}
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchMove={swipeHandlers.onTouchMove}
            onTouchEnd={swipeHandlers.onTouchEnd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <LazyImage
              src={imageArray[selectedIndex]}
              alt={`${productName} - Image ${selectedIndex + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/500x500?text=Product";
              }}
            />
          </motion.div>

          {/* Counter pill */}
          {imageArray.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {selectedIndex + 1}/{imageArray.length}
            </div>
          )}

          {/* Nav arrows */}
          {imageArray.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md lg:hidden"
              >
                <FiChevronLeft className="text-gray-800 text-sm" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md lg:hidden"
              >
                <FiChevronRight className="text-gray-800 text-sm" />
              </button>
            </>
          )}
        </div>

        {/* ── Horizontal Scrolling Thumbnails ── */}
        {imageArray.length > 1 && (
          <div className="flex gap-2 px-3 pt-2 overflow-x-auto scrollbar-hide">
            {imageArray.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  selectedIndex === index
                    ? "border-primary-600 ring-1 ring-primary-200"
                    : "border-gray-200 opacity-60 hover:opacity-100"
                }`}
              >
                <LazyImage
                  src={image}
                  alt={`${productName} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/100x100?text=T";
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {children}
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white z-10"
            >
              <FiX className="text-xl" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-7xl max-h-[90vh] w-full"
            >
              <img
                src={imageArray[selectedIndex]}
                alt={`${productName} - Full view`}
                className="w-full h-full object-contain max-h-[90vh] rounded-lg"
                onError={(e) => { e.target.src = "https://via.placeholder.com/800x800?text=Product"; }}
              />
              {imageArray.length > 1 && (
                <>
                  <button onClick={handlePrevious} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
                    <FiChevronLeft className="text-xl" />
                  </button>
                  <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
                    <FiChevronRight className="text-xl" />
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageGallery;
