import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'node:dns';
import User from '../src/models/User.model.js';
import { saveFcmToken } from '../src/services/fcm.service.js';

const getArg = (name) => {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
};

const main = async () => {
  const email = (getArg('email') || '').trim().toLowerCase();
  const userId = (getArg('userId') || '').trim();
  const token = (getArg('token') || '').trim();
  const deviceId = (getArg('deviceId') || 'test-device').trim();
  const platform = (getArg('platform') || 'web').trim();

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in environment.');
  }
  if (!email && !userId) {
    throw new Error('Pass --email <user_email> or --userId <mongo_object_id>');
  }
  if (!token) {
    throw new Error('Pass --token <fcm_token>');
  }

  // Mirror backend/src/server.js DNS behavior for Atlas SRV reliability.
  const mongoUri = process.env.MONGO_URI;
  const isMongoSrvUri = typeof mongoUri === 'string' && mongoUri.startsWith('mongodb+srv://');
  const forcePublicDns =
    process.env.FORCE_PUBLIC_DNS === 'true' ||
    (process.env.FORCE_PUBLIC_DNS !== 'false' && isMongoSrvUri);
  if (forcePublicDns) {
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
    } catch {
      // ignore
    }
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  const user = userId
    ? await User.findById(userId).select('_id email fcmTokens')
    : await User.findOne({ email }).select('_id email fcmTokens');
  if (!user) {
    const conn = mongoose.connection;
    const dbName = conn?.name || null;
    const host = conn?.host || null;
    const userCount = await User.countDocuments({});
    const sample = await User.find({})
      .select('_id email')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const maskEmail = (value) => {
      const raw = String(value || '');
      const at = raw.indexOf('@');
      if (at <= 1) return raw ? '***' : null;
      return `${raw[0]}***${raw.slice(at)}`;
    };

    console.log(
      JSON.stringify(
        {
          error: userId ? `User not found for _id: ${userId}` : `User not found for email: ${email}`,
          connectedDb: { host, dbName },
          userCount,
          sampleUsers: sample.map((u) => ({ _id: String(u._id), email: maskEmail(u.email) })),
        },
        null,
        2
      )
    );
    process.exitCode = 2;
    return;
  }

  const beforeCount = Array.isArray(user.fcmTokens) ? user.fcmTokens.length : 0;

  const ok = await saveFcmToken({
    recipientType: 'user',
    recipientId: user._id,
    token,
    platform,
    deviceId,
  });

  const after = await User.findById(user._id).select('fcmTokens');
  const afterCount = Array.isArray(after?.fcmTokens) ? after.fcmTokens.length : 0;
  const last = afterCount ? after.fcmTokens[afterCount - 1] : null;

  console.log(
    JSON.stringify(
      {
        ok,
        email,
        platform,
        deviceId,
        beforeCount,
        afterCount,
        lastTokenSuffix: last?.token ? String(last.token).slice(-12) : null,
      },
      null,
      2
    )
  );
};

main()
  .catch((err) => {
    console.error('[testFcmTokenSave] Failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });
