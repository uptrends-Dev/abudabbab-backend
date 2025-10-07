import {
  getAllBookings,
  getBookingById,
  createBooking,
  advancedTripsInfos,
  getTotalBookingsAndRevenue,
  exportBookings,
  updateBookingState
} from "../controllers/bookingController.js";
import express from "express";
import { requireAdmin } from "../helpers/auth.js";

const router = express.Router();

router.get("/admin", requireAdmin, getAllBookings);
router.get("/advancedTripsInfos/admin", requireAdmin, advancedTripsInfos);
router.get("/getTotalBookingsAndRevenue/admin", requireAdmin, getTotalBookingsAndRevenue);
router.get("/admin/:id", requireAdmin, getBookingById);
router.post("/export", requireAdmin, exportBookings);
router.patch("/admin/:id", requireAdmin, updateBookingState);

router.post("/", createBooking);


export default router;
