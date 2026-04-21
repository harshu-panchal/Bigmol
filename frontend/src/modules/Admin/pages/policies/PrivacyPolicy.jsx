import { useState, useEffect } from 'react';
import { FiSave, FiFileText } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const PrivacyPolicy = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPolicy = async () => {
      setLoading(true);
      try {
        const response = await adminService.getPolicy('privacy-policy');
        setContent(response.data?.content || '');
      } catch (error) {
        console.error(error);
        toast.error('Failed to load privacy policy');
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.updatePolicy('privacy-policy', content);
      toast.success('Privacy policy saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save privacy policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Privacy Policy</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your store's privacy policy</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <FiSave />
          )}
          <span>{saving ? 'Saving...' : 'Save Policy'}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <FiFileText className="text-primary-600" />
          <h3 className="font-semibold text-gray-800">Privacy Policy Content</h3>
        </div>
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            placeholder="Enter privacy policy content..."
          />
        )}
      </div>
    </motion.div>
  );
};

export default PrivacyPolicy;

