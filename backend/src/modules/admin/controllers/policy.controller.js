import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { ApiError } from '../../../utils/ApiError.js';
import Policy from '../../../models/Policy.model.js';

/**
 * @desc    Get policy by type
 * @route   GET /api/admin/policies/:type
 * @access  Private (Admin)
 */
export const getPolicy = asyncHandler(async (req, res) => {
    const { type } = req.params;
    
    let policy = await Policy.findOne({ type });
    
    // If not found, return empty content instead of 404 to avoid frontend errors on first load
    if (!policy) {
        policy = { type, content: '', isActive: true };
    }
    
    res.status(200).json(new ApiResponse(200, policy, 'Policy fetched.'));
});

/**
 * @desc    Create or update policy
 * @route   PUT /api/admin/policies/:type
 * @access  Private (Admin)
 */
export const updatePolicy = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { content } = req.body;

    if (!content) throw new ApiError(400, 'Content is required.');

    const policy = await Policy.findOneAndUpdate(
        { type },
        { 
            content, 
            lastUpdatedBy: req.user._id 
        },
        { new: true, upsert: true }
    );

    res.status(200).json(new ApiResponse(200, policy, 'Policy updated successfully.'));
});
