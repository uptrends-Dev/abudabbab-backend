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

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));

}

app.use(express.json());
// app.use(cors({
//   origin: process.env.CLIENT_URL || "http://localhost:3000",
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true
// }));

// app.use(cors({ origin: "*" }));
  

app.use("/api/trips", tripesRoutes);
app.use("/api/bookings", bookingRoutes);

// Catch wrong routes (like /ess/ee)
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(errorHandler);

// Start
connection().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// Handle unhandled promise rejections
let server;
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
