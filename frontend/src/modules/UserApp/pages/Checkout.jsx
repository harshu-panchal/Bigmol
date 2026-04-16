import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiCreditCard,
  FiTruck,
  FiCheck,
  FiX,
  FiPlus,
  FiArrowLeft,
  FiTag,
  FiLock,
  FiShoppingBag
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "../../../shared/store/useStore";
import { useAuthStore } from "../../../shared/store/authStore";
import { useAddressStore } from "../../../shared/store/addressStore";
import { useOrderStore } from "../../../shared/store/orderStore";
import { formatPrice } from "../../../shared/utils/helpers";
import api from "../../../shared/utils/api";
import toast from "react-hot-toast";
import MobileLayout from "../components/Layout/MobileLayout";
import MobileCheckoutSteps from "../components/Mobile/MobileCheckoutSteps";
import PageTransition from "../../../shared/components/PageTransition";
import OrderSummary from "../components/Mobile/CheckoutOrderSummary";

const MobileCheckout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart, getItemsByVendor } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { addresses, getDefaultAddress, addAddress, fetchAddresses } = useAddressStore();
  const { createOrder } = useOrderStore();

  const isWholesaler = user?.userType === 'wholesaler';

  const [step, setStep] = useState(1);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [shippingOption, setShippingOption] = useState("standard");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  
  // Payment & Address Form State
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [selectedEMIProvider, setSelectedEMIProvider] = useState("snapmint");
  const [selectedEMITenure, setSelectedEMITenure] = useState(3);
  const [formData, setFormData] = useState({
    label: "Home",
    fullName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: ""
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const EMI_PROVIDERS = [
    { id: 'snapmint', name: 'Snapmint', description: '25% Downpayment', icon: 'https://placehold.co/100x100/10b981/ffffff?text=Snap' },
    { id: 'bajaj', name: 'Bajaj Finserv', description: 'No Cost EMI', icon: 'https://placehold.co/100x100/10b981/ffffff?text=Bajaj' },
    { id: 'tvs', name: 'TVS Credit', description: 'Instant Approval', icon: 'https://placehold.co/100x100/10b981/ffffff?text=TVS' },
  ];

  const PAYMENT_TABS = [
    { id: 'online', name: 'Online', icon: FiCreditCard, description: 'UPI, Card, Wallet' },
    { id: 'emi', name: 'EMI', icon: FiTruck, description: 'Easy Installments' },
    { id: 'cod', name: 'COD', icon: FiMapPin, description: 'Pay on Delivery' },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses().then(() => {
        const def = getDefaultAddress();
        if (def) setShippingAddress(def);
      });
    }
  }, [isAuthenticated, fetchAddresses, getDefaultAddress]);

  const subtotal = useMemo(() => getTotal(), [items, getTotal]);
  // Basic calc (Real production would hit /shipping/estimate but keep it fast for now)
  const shipping = subtotal > 1000 ? 0 : 50;
  const discount = appliedDiscount;
  const tax = Math.round((subtotal - discount) * 0.18);
  const finalTotal = subtotal + shipping + tax - discount;

  const itemsByVendor = useMemo(() => getItemsByVendor(), [items, getItemsByVendor]);

  // EMI Logic
  const downPayment = useMemo(() => {
    if (paymentMethod !== 'emi') return 0;
    if (selectedEMIProvider === 'snapmint') return Math.round(finalTotal * 0.25);
    return 0; // Bajaj/TVS usually 0 downpayment in No Cost EMI
  }, [paymentMethod, selectedEMIProvider, finalTotal]);

  const emiInstallment = useMemo(() => {
    if (paymentMethod !== 'emi') return 0;
    // Precise math for production
    const emiAmount = (finalTotal - downPayment) / selectedEMITenure;
    return Math.round(emiAmount);
  }, [paymentMethod, finalTotal, downPayment, selectedEMITenure, selectedEMIProvider]);

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (!shippingAddress) return toast.error("Please select an address");
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    try {
      const orderData = {
        items: items.map(i => ({ 
          id: i.id,
          productId: i.id, 
          quantity: i.quantity, 
          variant: i.variant,
          price: i.price,
          name: i.name,
          image: i.image
        })),
        shippingAddress: {
          name: (shippingAddress.fullName || shippingAddress.name || "").trim(),
          phone: (shippingAddress.phone || "").replace(/\D/g, "").slice(-10),
          address: (shippingAddress.address || "").trim(),
          city: (shippingAddress.city || "").trim(),
          state: (shippingAddress.state || "").trim(),
          zipCode: (shippingAddress.zipCode || "").trim(),
          country: (shippingAddress.country || "India").trim(),
          email: (user?.email || "").trim()
        },
        paymentMethod,
        shippingOption,
        couponCode: appliedCoupon?.code,
        emiDetails: paymentMethod === 'emi' ? {
          provider: selectedEMIProvider,
          tenure: selectedEMITenure,
          installment: emiInstallment
        } : undefined,
        downPaymentAmount: downPayment
      };

      console.log("FINAL_ORDER_PAYLOAD:", JSON.stringify(orderData, null, 2));
      
      const order = await createOrder(orderData);
      
      if (paymentMethod === 'cod') {
        clearCart();
        navigate(`/order-confirmation/${order.orderId || order.id}`);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round((order.downPaymentAmount || order.total) * 100),
        currency: "INR",
        name: "BigMol",
        description: paymentMethod === 'emi' ? `EMI Downpayment - ${selectedEMIProvider.toUpperCase()}` : "Order Payment",
        order_id: order.razorpayOrderId,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone?.replace(/\D/g, "").slice(-10),
        },
        theme: { color: "#10b981" },
        handler: async (res) => {
          try {
            await api.post("/user/payments/verify", { ...res, orderId: order.orderId || order.id });
            clearCart();
            toast.success("Payment Received!");
            navigate(`/order-confirmation/${order.orderId || order.id}`);
          } catch (err) {
            toast.error("Verification failed");
          }
        },
        modal: { ondismiss: () => setIsPlacingOrder(false) }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("ORDER_PLACEMENT_ERROR:", err);
      const errorMsg = err?.response?.data?.message || err?.message || "Order failed";
      toast.error(errorMsg);
      setIsPlacingOrder(false);
    }
  };
  
  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsApplyingCoupon(true);
    try {
      const res = await api.post("/coupons/validate", { code: couponCode, cartTotal: subtotal });
      setAppliedCoupon(res.data.coupon);
      setAppliedDiscount(res.data.discount);
      toast.success("Coupon Applied!");
    } catch (err) {
      toast.error("Invalid coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.address || !formData.phone || !formData.city) {
      return toast.error("Please fill all required fields");
    }
    
    setIsSavingAddress(true);
    try {
      await addAddress({
        ...formData,
        name: formData.label || "Home",
        zipCode: formData.zipCode || "000000",
        state: formData.state || "State",
        country: "India",
        isDefault: addresses.length === 0
      });
      toast.success("Address saved successfully!");
      setShowAddressForm(false);
      setFormData({ fullName: "", address: "", city: "", state: "", zipCode: "", phone: "" });
      fetchAddresses();
    } catch (err) {
      toast.error("Failed to save address");
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <PageTransition>
      <MobileLayout title="Checkout" showBack backLink="/cart" showBottomNav={false} showCartBar={false}>
        <div className="pb-32 px-4 pt-4 bg-gray-50 min-h-screen">
          <form onSubmit={handlePlaceOrder} className="space-y-6 max-w-2xl mx-auto">
            
            <div className="flex items-center justify-between px-6 mb-10 mt-2">
              {[
                { n: 1, label: "Address" },
                { n: 2, label: "Payment" }
              ].map((s, idx) => (
                <div key={s.n} className="flex items-center flex-1 last:flex-none relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm z-10 ${step >= s.n ? "gradient-green text-white" : "bg-gray-100 text-gray-400"}`}>
                      {step > s.n ? <FiCheck /> : s.n}
                    </div>
                    <span className={`absolute -bottom-6 text-[10px] font-bold uppercase tracking-wider ${step >= s.n ? "text-primary-600" : "text-gray-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx === 0 && <div className={`h-1 flex-1 mx-2 rounded-full -mt-5 transition-all duration-500 ${step > 1 ? "gradient-green" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>

            {step === 1 ? (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Address</h2>
                    <button type="button" onClick={() => setShowAddressForm(true)} className="text-primary-600 font-bold text-sm flex items-center gap-1">
                      <FiPlus /> New
                    </button>
                  </div>
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div key={addr._id} onClick={() => setShippingAddress(addr)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${shippingAddress?._id === addr._id ? "border-primary-500 bg-primary-50" : "border-white bg-white shadow-sm"}`}>
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-800">{addr.name}</span>
                          {shippingAddress?._id === addr._id && <FiCheck className="text-primary-500" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{addr.address}, {addr.city}</p>
                        <p className="text-xs font-bold text-gray-700 mt-1">{addr.phone}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50">
                  <button type="button" onClick={() => setStep(2)} disabled={!shippingAddress} className="w-full py-4 gradient-green text-white rounded-2xl font-bold shadow-glow-green disabled:opacity-50">
                    Next: Payment Options
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-32">
                
                {/* Product Preview in Payment Step */}
                <div className="bg-white rounded-3xl p-1 shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Order Items</h3>
                    <span className="text-[10px] font-bold text-primary-600 bg-white px-2 py-0.5 rounded-full border border-primary-100">
                      {items.length} {items.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>
                  <OrderSummary 
                    itemsByVendor={itemsByVendor}
                    total={subtotal}
                    discount={appliedDiscount}
                    shipping={shipping}
                    tax={tax}
                    finalTotal={finalTotal}
                    paymentMethod={paymentMethod}
                    downPayment={downPayment}
                  />
                </div>

                {/* 3-Tab Selector */}
                <section>
                  <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Payment Method</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_TABS.map((tab) => (
                      <button key={tab.id} type="button" onClick={() => setPaymentMethod(tab.id)} className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === tab.id ? "border-primary-500 bg-primary-50 text-primary-700" : "border-white bg-white text-gray-400 shadow-sm"}`}>
                        <tab.icon className="text-xl" />
                        <span className="text-[10px] font-bold">{tab.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    {paymentMethod === 'emi' && (
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                        <div className="space-y-3">
                          {EMI_PROVIDERS.map((p) => (
                            <div key={p.id} onClick={() => setSelectedEMIProvider(p.id)} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedEMIProvider === p.id ? "border-primary-500 bg-primary-50/50" : "border-gray-50 bg-white"}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                  <img 
                                    src={p.icon} 
                                    alt={p.name} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div className="hidden w-full h-full items-center justify-center bg-primary-100 text-primary-700 font-black text-[10px] uppercase">
                                    {p.name.substring(0, 2)}
                                  </div>
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-gray-800">{p.name}</p>
                                  <p className="text-[10px] text-gray-400 font-medium tracking-tight">{p.description}</p>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedEMIProvider === p.id ? "border-primary-500 bg-primary-500" : "border-gray-200"}`}>
                                {selectedEMIProvider === p.id && <FiCheck className="text-white text-xs" />}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-gray-400 uppercase">Tenure</p>
                          <div className="flex gap-2">
                            {[3, 6, 9, 12].map(m => (
                              <button key={m} type="button" onClick={() => setSelectedEMITenure(m)} className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold ${selectedEMITenure === m ? "border-primary-500 bg-primary-500 text-white" : "border-gray-100 text-gray-400"}`}>{m}M</button>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                          <div className="flex justify-between text-xs"><span className="text-gray-500">EMI Amount:</span><span className="font-bold">{formatPrice(emiInstallment)}/mo</span></div>
                          <div className="flex justify-between items-center py-1.5 px-3 bg-green-100 text-green-700 rounded-lg text-xs font-bold"><span>Payable Now:</span><span>{formatPrice(downPayment)}</span></div>
                        </div>
                      </div>
                    )}
                    {paymentMethod === 'online' && (
                      <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 text-center space-y-2">
                        <FiLock className="mx-auto text-2xl text-primary-500" />
                        <p className="text-sm font-bold text-primary-700">UPI / Card / Wallets</p>
                        <p className="text-[10px] text-primary-600">Pay securely via Razorpay</p>
                      </div>
                    )}
                    {paymentMethod === 'cod' && (
                      <div className="p-4 bg-gray-100 rounded-2xl text-center space-y-2">
                        <FiMapPin className="mx-auto text-2xl text-gray-400" />
                        <p className="text-sm font-bold text-gray-700">Pay on Delivery</p>
                        <p className="text-[10px] text-gray-500">Service available for orders below ₹5,000</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Summary */}
                <section className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Summary</h2>
                    {isWholesaler && <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">Wholesale</span>}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                    {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
                    <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span></div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t text-gray-800"><span>Total</span><span>{formatPrice(finalTotal)}</span></div>
                    {paymentMethod === 'emi' && <div className="flex justify-between font-black text-green-600 pt-1"><span>Payable Now</span><span>{formatPrice(downPayment)}</span></div>}
                  </div>
                </section>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50 flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="p-4 bg-gray-100 text-gray-500 rounded-2xl font-bold"><FiArrowLeft /></button>
                  <button type="submit" disabled={isPlacingOrder} className="flex-1 py-4 gradient-green text-white rounded-2xl font-bold shadow-glow-green">
                    {isPlacingOrder ? "Processing..." : "Confirm & Place Order"}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </div>

        {/* Address Modal Fragment */}
        <AnimatePresence>
          {showAddressForm && (
            <div className="fixed inset-0 bg-black/70 z-[10000] flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={() => setShowAddressForm(false)}>
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                onClick={e => e.stopPropagation()} 
                className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl p-8 space-y-5 shadow-2xl relative"
              >
                 <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2 sm:hidden" />
                 <div className="flex justify-between items-center">
                   <h3 className="font-extrabold text-2xl text-gray-800">New Address</h3>
                   <button onClick={() => setShowAddressForm(false)} className="p-2 bg-gray-100 rounded-full text-gray-400"><FiX /></button>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Save As (Label)</label>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-primary-500 transition-all outline-none" placeholder="Home, Office..." value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Full Name</label>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-primary-500 transition-all outline-none" placeholder="Enter recipient name" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Complete Address</label>
                     <input className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-primary-500 transition-all outline-none" placeholder="House no, Building, Area" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 ml-1 uppercase">City</label>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-primary-500 transition-all outline-none" placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Phone Number</label>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-primary-500 transition-all outline-none" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 ml-1 uppercase">State</label>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-primary-500 transition-all outline-none" placeholder="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Zip Code</label>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-primary-500 transition-all outline-none" placeholder="Zip" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                     </div>
                   </div>
                 </div>

                 <button 
                  type="button" 
                  disabled={isSavingAddress}
                  onClick={handleSaveAddress} 
                  className="w-full py-4 gradient-green text-white rounded-2xl font-black shadow-glow-green transform active:scale-95 transition-all"
                 >
                   {isSavingAddress ? "Saving..." : "Save Address"}
                 </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </MobileLayout>
    </PageTransition>
  );
};

export default MobileCheckout;
