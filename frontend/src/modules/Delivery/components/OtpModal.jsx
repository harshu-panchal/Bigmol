import React, { useState, useEffect } from 'react';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { toast } from 'react-hot-toast';

const OtpModal = ({ orderId, isOpen, onClose, onSuccess }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const completeOrder = useDeliveryAuthStore((state) => state.completeOrder);
  const resendDeliveryOtp = useDeliveryAuthStore((state) => state.resendDeliveryOtp);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOrder(orderId, otpString);
      toast.success('Order delivered successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendDeliveryOtp(orderId);
      toast.success('OTP resent to customer!');
      setResendCooldown(60);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in duration-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Verify Delivery</h3>
        <p className="text-gray-500 text-center mb-8">Enter the 6-digit code provided by the customer to complete delivery.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2 mb-8">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-0 transition-colors"
                maxLength={1}
                required
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
              isSubmitting ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            }`}
          >
            {isSubmitting ? 'Verifying...' : 'Complete Delivery'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className={`text-sm font-medium ${
              resendCooldown > 0 ? 'text-gray-400' : 'text-indigo-600 hover:text-indigo-700'
            }`}
          >
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP to customer'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-gray-500 text-sm font-medium hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default OtpModal;
