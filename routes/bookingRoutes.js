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

const router = express.Router();

router.get("/admin", getAllBookings);
router.get("/advancedTripsInfos/admin", advancedTripsInfos);
router.get("/getTotalBookingsAndRevenue/admin", getTotalBookingsAndRevenue);
router.get("/admin/:id", getBookingById);
router.post("/export", exportBookings);
router.post("/", createBooking);
router.patch("/admin/:id", updateBookingState);


export default router;
