import mongoose from 'mongoose';

const policySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            unique: true,
            enum: ['privacy-policy', 'refund-policy', 'terms-conditions'],
        },
        content: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
        }
    },
    { timestamps: true }
);

const Policy = mongoose.model('Policy', policySchema);
export default Policy;
