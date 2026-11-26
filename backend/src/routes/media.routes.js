import express from 'express';
import mongoose from 'mongoose';
import Media from '../models/Media.model.js';

const router = express.Router();

// GET /api/media/:id — streams an image stored in MongoDB.
router.get('/:id', async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
        const media = await Media.findById(req.params.id).select('+data contentType updatedAt').lean();
        if (!media) return res.status(404).end();

        res.set({
            'Content-Type': media.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Last-Modified': new Date(media.updatedAt).toUTCString(),
        });
        res.send(Buffer.from(media.data.buffer ?? media.data));
    } catch (err) {
        next(err);
    }
});

export default router;
