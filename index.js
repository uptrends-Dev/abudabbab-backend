// index.js
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import connection from "./config/dataBase.js";
import tripesRoutes from "./routes/tripesRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import AppError from "./utils/AppError.js";
import errorHandler from "./midelWares/errorHandler.js";
import cors from "cors";
import crypto from "crypto";
import authRouter from "./routes/authRoutes.js";
import { requireAdmin } from "./helpers/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = !!process.env.VERCEL;



// Optional: background cleanup (local only)


// ============================
// Middlewares
// ============================
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(express.json());


// CORS configuration
// --- CORS: first middleware ---
// --- CORS for cookies (put BEFORE routes) ---
const allowed = new Set([
  "http://localhost:3000",
  "https://ozone-app-omega.vercel.app",
  "https://ozone-website-inky.vercel.app",
]);

app.use((req, res, next) => {
  const origin = (req.headers.origin || "").replace(/\/$/, "");

  if (origin && allowed.has(origin)) {
    // IMPORTANT: never "*" when sending credentials
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  // helpful but optional
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  // include any extra headers you use
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ============================
// Routes
// ============================

// Auth endpoints
app.use("/api/admin/auth", authRouter);

// ✅ Protect admin-only APIs by adding `requireAdmin` before the router.
// If ALL trips/bookings are admin-only, uncomment the two lines below:
app.use("/api/trips", requireAdmin, tripesRoutes);
app.use("/api/bookings", requireAdmin, bookingRoutes);
// app.use("/api/trips", tripesRoutes);
// app.use("/api/bookings", bookingRoutes);

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

// ✅ في Vercel: ممنوع listen — نكتفي بالتصدير
// ✅ محليًا: نعمل listen عادي
let server;
if (!IS_VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// // Graceful shutdown (للتشغيل المحلي فقط)
// process.on("unhandledRejection", (err) => {
//   console.error("UNHANDLED REJECTION 💥", err);
//   if (server) {
//     server.close(() => {
//       console.log("Shutting down gracefully…");
//       process.exit(1);
//     });
//   } else {
//     process.exit(1);
//   }
// });
// app.options("*", cors(corsOptions));

// مهم جدًا لفريسل
export default app;