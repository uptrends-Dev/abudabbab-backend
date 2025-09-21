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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = !!process.env.VERCEL; // Vercel يضبط المتغير ده تلقائيًا

// Middlewares
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json());

// لو عايز CORS بسيط شغّاله كده (أو خصّص origin من ENV)
app.use(
  cors(
    process.env.CLIENT_URL
      ? { origin: process.env.CLIENT_URL.split(","), credentials: true }
      : {}
  )
);

// Routes
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

// ✅ في Vercel: ممنوع listen — نكتفي بالتصدير
// ✅ محليًا: نعمل listen عادي
let server;
if (!IS_VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Graceful shutdown (للتشغيل المحلي فقط)
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥", err);
  if (server) {
    server.close(() => {
      console.log("Shutting down gracefully…");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// مهم جدًا لفريسل
export default app;
