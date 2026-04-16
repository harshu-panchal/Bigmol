// MobileProductCard now delegates to the shared ProductCard
// so that all product displays use the same consistent card UI.
import ProductCard from "../../../../shared/components/ProductCard";

const MobileProductCard = ({ product }) => {
  return <ProductCard product={product} />;
};

export default MobileProductCard;
