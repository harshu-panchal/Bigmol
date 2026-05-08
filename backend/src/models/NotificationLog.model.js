import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientType: { type: String, enum: ['user', 'vendor', 'delivery', 'admin'], required: true, index: true },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    meta: { type: Map, of: String },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), index: true },
  },
  { timestamps: true }
);

notificationLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
export default NotificationLog;
