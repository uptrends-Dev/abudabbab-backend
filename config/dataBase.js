import mongoose from "mongoose";

// DB connection
async function connection() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("mongoDb connected successfully");
  } catch (error) {
    console.error("Mongo connection error:", error);
    process.exit(1); 
  }
}
export default connection;
