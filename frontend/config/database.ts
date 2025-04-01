import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("MongoDB connected...");
  } catch (err) {
    console.error((err as Error).message);
    throw new Error("Failed to connect to Database");
  }
};

export default connectDB;