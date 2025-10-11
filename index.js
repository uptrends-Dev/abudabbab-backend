// index.js
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import connection from "./config/dataBase.js";
import tripesRoutes from "./routes/tripesRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import AppError from "./utils/AppError.js";
import errorHandler from "./midelWares/errorHandler.js";
import authRouter from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const IS_VERCEL = !!process.env.VERCEL;

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(express.json());

// Auth endpoints
app.use("/api/admin/auth", authRouter);

// ✅ Protect admin-only APIs by adding `requireAdmin` before the router.
// If ALL trips/bookings are admin-only, uncomment the two lines below:
app.use("/api/trips", tripesRoutes);
app.use("/api/bookings", bookingRoutes);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(errorHandler);

// DB connection (مرة واحدة عند الـ cold start)
connection().catch((err) => {
  console.error("Mongo connection error:", err);
});

let server;
if (!IS_VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
