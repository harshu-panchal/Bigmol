import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../shared/store/authStore';
import { isValidEmail, isValidPhone } from '../../../shared/utils/helpers';
import toast from 'react-hot-toast';
import MobileLayout from "../components/Layout/MobileLayout";
import PageTransition from '../../../shared/components/PageTransition';

const MobileRegister = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formMode, setFormMode] = useState('signup'); // 'signup' or 'login'

  // Safety: reset loading state on mount just in case it was persisted as true
  useEffect(() => {
    useAuthStore.setState({ isLoading: false });
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const handleModeChange = (mode) => {
    setFormMode(mode);
    if (mode === 'login') {
      navigate('/login');
    }
  };

  const onSubmit = async (data) => {
    try {
      // Combine first name and last name
      const fullName = `${data.firstName} ${data.lastName}`;
      const normalizedEmail = String(data.email || '').trim().toLowerCase();
      const phone = data.phone;
      const userType = data.userType || 'retailer';

      await registerUser(fullName, normalizedEmail, data.password, phone, userType);
      toast.success('Account created! Please verify your email.');
      // Navigate to verification page
      navigate('/verification', { state: { email: normalizedEmail } });
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Registration failed';
      toast.error(message);
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
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-gray-900 mb-1">Get Started</h1>
                <p className="text-xs text-gray-500">Create an account to explore our app</p>
              </div>

              {/* Sign Up / Log In Toggle */}
              <div className="mb-5">
                <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleModeChange('signup')}
                    className={`flex-1 py-2 px-4 rounded-md text-xs font-semibold transition-all duration-200 ${formMode === 'signup'
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    className={`flex-1 py-2 px-4 rounded-md text-xs font-semibold transition-all duration-200 ${formMode === 'login'
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                      }`}
                  >
                    Log In
                  </button>
                </div>
              </div>

              {/* Register Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                {/* Names Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* First Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">
                      First Name
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        {...register('firstName', {
                          required: 'Required',
                          minLength: { value: 2, message: 'Short' },
                        })}
                        className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 ${errors.firstName
                            ? 'border-red-200 focus:border-red-400'
                            : 'border-gray-50 focus:border-primary-400'
                          } focus:outline-none transition-colors text-xs bg-gray-50/50`}
                        placeholder="Raj"
                      />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        {...register('lastName', {
                          required: 'Required',
                          minLength: { value: 2, message: 'Short' },
                        })}
                        className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 ${errors.lastName
                            ? 'border-red-200 focus:border-red-400'
                            : 'border-gray-50 focus:border-primary-400'
                          } focus:outline-none transition-colors text-xs bg-gray-50/50`}
                        placeholder="Sarkar"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email required',
                        validate: (value) => isValidEmail(value) || 'Invalid email',
                      })}
                      className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 ${errors.email
                          ? 'border-red-200 focus:border-red-400'
                          : 'border-gray-50 focus:border-primary-400'
                        } focus:outline-none transition-colors text-xs bg-gray-50/50`}
                      placeholder="Email address"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">
                    Phone Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      {...register('countryCode', { required: true })}
                      className="w-20 px-2 py-2.5 rounded-xl border-2 border-gray-50 bg-gray-50/50 focus:border-primary-400 focus:outline-none text-[11px] font-medium"
                    >
                      <option value="+91">+91</option>
                      <option value="+880">+880</option>
                      <option value="+1">+1</option>
                    </select>
                    <div className="relative flex-1">
                      <FiPhone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="tel"
                        {...register('phone', {
                          required: 'Phone required',
                          validate: (value) => isValidPhone(value) || 'Invalid phone',
                        })}
                        className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 ${errors.phone
                            ? 'border-red-200 focus:border-red-400'
                            : 'border-gray-50 focus:border-primary-400'
                          } focus:outline-none transition-colors text-xs bg-gray-50/50`}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* User Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">
                      Type
                    </label>
                    <div className="relative">
                      <select
                        {...register('userType', { required: true })}
                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border-2 border-gray-50 bg-gray-50/50 focus:border-primary-400 focus:outline-none text-xs font-medium appearance-none"
                        defaultValue="retailer"
                      >
                        <option value="retailer">Retailer</option>
                        <option value="wholesaler">Wholesaler</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', {
                          required: 'Required',
                          minLength: { value: 6, message: 'Too short' },
                        })}
                        className={`w-full pl-10 pr-8 py-2.5 rounded-xl border-2 ${errors.password
                            ? 'border-red-200 focus:border-red-400'
                            : 'border-gray-50 focus:border-primary-400'
                          } focus:outline-none transition-colors text-xs bg-gray-50/50`}
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? 'Processing...' : 'Create Account'}
                </button>
              </form>

              {/* Sign In Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileRegister;
