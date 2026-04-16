import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from '../../../shared/components/PageTransition';
import { useAuthStore } from '../../../shared/store/authStore';

const MobileVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { verifyOTP, resendOTP, pendingEmail, isLoading } = useAuthStore();
  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const email =
    String(location.state?.email || pendingEmail || searchParams.get('email') || '')
      .trim()
      .toLowerCase();

  // Focus first input on mount
  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
      return;
    }
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [email, navigate]);

  const handleChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1 || (value && !/^\d$/.test(value))) return;

    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);

    // Auto-focus next input
    if (value && index < codes.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (pastedData.length === codes.length && /^\d+$/.test(pastedData)) {
      const newCodes = pastedData.split('');
      setCodes(newCodes);
      inputRefs.current[codes.length - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = codes.join('');

    if (verificationCode.length !== codes.length) {
      toast.error('Please enter the complete verification code');
      return;
    }

    try {
      await verifyOTP(email, verificationCode);
      toast.success('Verification successful!');
      navigate('/home');
    } catch (error) {
      toast.error('Invalid verification code. Please try again.');
    }
  };

  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  const handleResend = async () => {
    if (!email || !canResend) return;
    try {
      await resendOTP(email);
      toast.success('Verification code sent to your email');
      setTimer(30);
      setCanResend(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to resend code');
    }
  };

  return (
    <PageTransition>
      <MobileLayout showBottomNav={false} showCartBar={false}>
        <div className="w-full min-h-screen flex items-start justify-center px-4 pt-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              {/* Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="mb-4 flex items-center text-gray-500 hover:text-gray-900 transition-colors"
              >
                <FiArrowLeft className="mr-1" size={18} />
                <span className="text-xs font-medium">Back</span>
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                {/* Verification Icon */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full gradient-green flex items-center justify-center shadow-sm">
                          <FiCheck className="text-white" size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <h1 className="text-lg font-bold text-gray-900 mb-1">Verification code</h1>
                <p className="text-[13px] text-gray-500 leading-relaxed px-4">
                  Enter the code sent to <br/>
                  <span className="font-semibold text-gray-800 lowercase">{email || 'email'}</span>
                </p>
              </div>

              {/* Code Input Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-center gap-2">
                  {codes.map((code, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className={`w-10 h-10 rounded-xl border-2 text-center text-lg font-bold focus:outline-none transition-all ${code
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-100 focus:border-primary-400 text-gray-900'
                        }`}
                    />
                  ))}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || codes.some(code => !code)}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3.5 rounded-xl font-semibold text-base transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying...' : 'Confirm'}
                </button>
              </form>

              {/* Resend Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?{' '}
                  <button
                    onClick={handleResend}
                    disabled={!canResend}
                    className={`font-semibold transition-colors ${
                      canResend 
                        ? 'text-primary-600 hover:text-primary-700' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {canResend ? 'Resend' : `Resend in ${timer}s`}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileVerification;

