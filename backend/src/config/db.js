import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set");
  }

  const maxPoolSize = Math.max(Number(process.env.MONGO_MAX_POOL_SIZE) || 20, 5);
  const minPoolSize = Math.max(Number(process.env.MONGO_MIN_POOL_SIZE) || 5, 0);
  const connectTimeoutMS = Math.max(Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 15000, 1000);

  try {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error(`MongoDB connect timed out after ${connectTimeoutMS}ms`);
        err.code = "MONGO_CONNECT_TIMEOUT";
        reject(err);
      }, connectTimeoutMS);

      timeoutId?.unref?.();
    });

    const connectPromise = mongoose.connect(uri, {
      maxPoolSize,
      minPoolSize,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: Math.min(connectTimeoutMS, 15000),
    });

    const conn = await Promise.race([connectPromise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const details = {
      name: error?.name,
      code: error?.code,
      errno: error?.errno,
      syscall: error?.syscall,
      hostname: error?.hostname,
      message: error?.message,
    };

    console.error("MongoDB connection error:", details);
    process.exit(1);
  }
};

export default connectDB;
