const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden h-full flex flex-col shadow-sm border border-gray-100">
      {/* Square Image Skeleton */}
      <div className="w-full aspect-square bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
        <div className="absolute inset-0 shimmer"></div>
      </div>

      {/* Content Skeleton */}
      <div className="p-2.5 flex-1 flex flex-col gap-1.5">
        {/* Category chip */}
        <div className="h-4 bg-gray-200 rounded-full w-16 relative overflow-hidden">
          <div className="absolute inset-0 shimmer"></div>
        </div>

        {/* Title */}
        <div className="h-3 bg-gray-200 rounded w-full relative overflow-hidden">
          <div className="absolute inset-0 shimmer"></div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-3/4 relative overflow-hidden">
          <div className="absolute inset-0 shimmer"></div>
        </div>

        {/* Price row */}
        <div className="flex items-center gap-2 mt-auto">
          <div className="h-4 bg-gray-300 rounded w-16 relative overflow-hidden">
            <div className="absolute inset-0 shimmer"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-10 relative overflow-hidden">
            <div className="absolute inset-0 shimmer"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded-full w-10 relative overflow-hidden">
            <div className="absolute inset-0 shimmer"></div>
          </div>
        </div>

        {/* Button */}
        <div className="h-7 bg-gray-300 rounded-xl mt-1 relative overflow-hidden">
          <div className="absolute inset-0 shimmer"></div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
