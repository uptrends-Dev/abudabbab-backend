import {
  getAllBookings,
  getBookingById,
  createBooking,
} from "../controllers/bookingController.js";
import express from "express";

const router = express.Router();

router.get("/admin", getAllBookings);
router.get("/admin/:id", getBookingById);
router.post("/", createBooking);

export default router;
