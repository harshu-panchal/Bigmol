import { FiShoppingBag } from "react-icons/fi";
import { formatPrice } from "../../../../shared/utils/helpers";
import { formatVariantLabel, getVariantSignature } from "../../../../shared/utils/variant";

const OrderSummary = ({ itemsByVendor, total, discount, shipping, tax, finalTotal, paymentMethod, downPayment }) => {
  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-base font-bold text-gray-800 mb-3">Order Summary</h3>
      {/* ... items render code ... */}
      <div className="space-y-4 mb-6">
        {itemsByVendor.map((vendorGroup) => (
          <div key={vendorGroup.vendorId} className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sold by</span>
               <span className="text-xs font-bold text-primary-600 truncate">{vendorGroup.vendorName}</span>
            </div>
            
            <div className="space-y-3 pl-1">
              {vendorGroup.items.map((item, itemIndex) => (
                <div
                  key={`${item.id}-${itemIndex}-${getVariantSignature(item?.variant || {})}`}
                  className="flex gap-4 items-start"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 shadow-sm">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="text-sm font-extrabold text-gray-800 leading-tight truncate">{item.name}</h4>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-primary-500">{formatPrice(item.price)}</span>
                      <span className="text-[10px] text-gray-400 font-bold">× {item.quantity}</span>
                    </div>

                    {formatVariantLabel(item?.variant) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {Object.entries(item.variant).map(([key, val]) => (
                          <span key={key} className="px-2 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500 uppercase tracking-tight">
                            {key}: {val}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="py-1 text-right">
                    <p className="text-sm font-black text-gray-800">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatPrice(total)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span>
            {shipping === 0 ? <span className="text-green-600 font-semibold">FREE</span> : formatPrice(shipping)}
          </span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax</span>
          <span>{formatPrice(tax)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200">
          <span>Total Amount</span>
          <span className="text-primary-600">{formatPrice(finalTotal)}</span>
        </div>
        
        {paymentMethod === 'emi' && (
          <div className="flex justify-between items-center text-xl font-extrabold text-[#10b981] mt-4 p-3 bg-green-50 rounded-xl border border-green-100 shadow-sm">
            <span>Payable Now</span>
            <span>{formatPrice(downPayment)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;

