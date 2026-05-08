import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
import DeliveryBoy from '../models/DeliveryBoy.model.js';
import NotificationLog from '../models/NotificationLog.model.js';
import { getMessaging } from '../config/firebaseAdmin.js';
import buildNotificationPayload from '../utils/notificationPayload.js';

const MAX_TOKENS_PER_PLATFORM = 10;
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

const ACCOUNT_MODELS = {
  user: User,
  vendor: Vendor,
  delivery: DeliveryBoy,
};

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const sanitizeTokenEntry = ({ token, platform = 'web', deviceId = '' }) => ({
  token: String(token || '').trim(),
  platform: ['web', 'android', 'ios'].includes(platform) ? platform : 'web',
  deviceId: String(deviceId || '').trim(),
  createdAt: new Date(),
});

const getModel = (recipientType) => ACCOUNT_MODELS[String(recipientType || '').toLowerCase()];

export const saveFcmToken = async ({ recipientType, recipientId, token, platform = 'web', deviceId = '' }) => {
  const Model = getModel(recipientType);
  const id = toObjectId(recipientId);
  const normalized = String(token || '').trim();
  if (!Model || !id || !normalized) return false;

  const tokenDoc = sanitizeTokenEntry({ token: normalized, platform, deviceId });

  await Model.updateOne(
    { _id: id },
    {
      $pull: { fcmTokens: { $or: [{ token: normalized }, { deviceId: tokenDoc.deviceId, platform: tokenDoc.platform }] } },
    }
  );

  await Model.updateOne({ _id: id }, { $addToSet: { fcmTokens: tokenDoc } });

  const user = await Model.findById(id).select('fcmTokens');
  if (!user) return false;

  const filtered = (user.fcmTokens || []).filter((entry) => entry.platform === tokenDoc.platform);
  const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const keep = new Set(sorted.slice(0, MAX_TOKENS_PER_PLATFORM).map((entry) => String(entry.token)));

  await Model.updateOne({ _id: id }, {
    $pull: {
      fcmTokens: {
        platform: tokenDoc.platform,
        token: { $nin: Array.from(keep) },
      },
    },
  });

  return true;
};

export const removeFcmToken = async ({ recipientType, recipientId, token }) => {
  const Model = getModel(recipientType);
  const id = toObjectId(recipientId);
  const normalized = String(token || '').trim();
  if (!Model || !id || !normalized) return false;

  await Model.updateOne({ _id: id }, { $pull: { fcmTokens: { token: normalized } } });
  return true;
};

const cleanupInvalidTokens = async ({ recipientType, recipientId, tokens }) => {
  if (!tokens?.length) return;
  const Model = getModel(recipientType);
  const id = toObjectId(recipientId);
  if (!Model || !id) return;
  await Model.updateOne({ _id: id }, { $pull: { fcmTokens: { token: { $in: tokens } } } });
};

export const sendNotificationToUser = async ({
  notificationId,
  recipientType,
  recipientId,
  title,
  message,
  type = 'system',
  link = '/',
  extraData = {},
}) => {
  const id = toObjectId(recipientId);
  const Model = getModel(recipientType);
  if (!id || !Model) return { sent: false, reason: 'invalid-recipient' };

  try {
    await NotificationLog.create({ notificationId, recipientId: id, recipientType, status: 'sent' });
  } catch (error) {
    if (error?.code === 11000) {
      return { sent: false, reason: 'duplicate-notification' };
    }
    throw error;
  }

  const account = await Model.findById(id).select('fcmTokens');
  const tokens = (account?.fcmTokens || []).map((t) => t?.token).filter(Boolean);
  if (!tokens.length) return { sent: false, reason: 'no-tokens' };

  const payload = buildNotificationPayload({
    notificationId,
    title,
    body: message,
    link,
    type,
    recipientType,
    extraData,
  });

  const messaging = getMessaging();
  if (!messaging) return { sent: false, reason: 'firebase-not-configured' };

  const response = await messaging.sendEachForMulticast({ ...payload, tokens });

  const invalidTokens = [];
  response.responses.forEach((result, index) => {
    const code = result?.error?.code;
    if (!result.success && INVALID_TOKEN_CODES.has(code)) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length) {
    await cleanupInvalidTokens({ recipientType, recipientId: id, tokens: invalidTokens });
  }

  return {
    sent: true,
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
};

export const emitNotificationEvent = ({
  notificationId,
  recipientType,
  recipientId,
  title,
  message,
  type,
  data = {},
}) => {
  setImmediate(async () => {
    try {
      await sendNotificationToUser({
        notificationId,
        recipientType,
        recipientId,
        title,
        message,
        type,
        link: data?.link || data?.route || '/',
        extraData: data,
      });
    } catch (error) {
      console.error('[FCM] Notification dispatch failed:', error.message);
    }
  });
};
