import Settings from '../../../models/Settings.model.js';
import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';

/**
 * GET /api/admin/settings
 * Fetch all settings from the database
 */
export const getSettings = asyncHandler(async (req, res) => {
    const allSettings = await Settings.find({});
    
    // Transform array of [{key, value}, ...] into a single object { [key]: value }
    const settingsObject = allSettings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    res.status(200).json(
        new ApiResponse(200, settingsObject, 'Settings fetched successfully')
    );
});

/**
 * PUT /api/admin/settings
 * Update settings (merges or replaces based on input)
 */
export const updateSettings = asyncHandler(async (req, res) => {
    const settingsData = req.body; // e.g. { general: {...}, theme: {...} }

    if (!settingsData || typeof settingsData !== 'object') {
        throw new ApiError(400, 'Invalid settings data');
    }

    const keys = Object.keys(settingsData);
    const results = [];

    // Use a loop to update each section (key)
    for (const key of keys) {
        const value = settingsData[key];
        
        const updated = await Settings.findOneAndUpdate(
            { key },
            { key, value },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push(updated);
    }

    // Transform results back to object format for response
    const updatedSettingsObject = results.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    res.status(200).json(
        new ApiResponse(200, updatedSettingsObject, 'Settings updated successfully')
    );
});
