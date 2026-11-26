import mongoose from 'mongoose';

// Image files stored directly in MongoDB (one document per file, max 16 MB each).
// Served by GET /api/media/:id (see src/routes/media.routes.js).
const mediaSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true }, // e.g. "products/blazer.png"
        contentType: { type: String, required: true },
        size: { type: Number, required: true },
        data: { type: Buffer, required: true, select: false },
    },
    { timestamps: true }
);

const Media = mongoose.model('Media', mediaSchema);
export { Media };
export default Media;
