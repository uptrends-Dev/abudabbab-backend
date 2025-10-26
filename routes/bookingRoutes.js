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
import { allowedTo, requireAdmin } from "../midelWares/authHandler.js";


const router = express.Router();

router.get("/admin", requireAdmin, allowedTo("EMPLOYEE", "ADMIN", "FINANCE"), getAllBookings);
router.get("/admin/:id", requireAdmin, allowedTo("EMPLOYEE", "ADMIN", "FINANCE" , "GATE"), getBookingById);
router.post("/export", requireAdmin, allowedTo("ADMIN", "FINANCE"), exportBookings);
router.patch("/admin/:id", requireAdmin, allowedTo("ADMIN", "GATE"), updateBookingState);
router.get("/advancedTripsInfos/admin", requireAdmin, allowedTo("FINANCE"), advancedTripsInfos);
router.get("/getTotalBookingsAndRevenue/admin", requireAdmin, allowedTo("FINANCE"), getTotalBookingsAndRevenue);
router.post("/", createBooking);

export default router;
