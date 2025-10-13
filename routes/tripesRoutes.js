import express from "express";
const router = express.Router();
import {
  getAllTrips,
  getTripById,
  createTrip,
  deleteTrip,
  updateTrip,
} from "../controllers/tripsControler.js";
import { allowedTo, requireAdmin } from "../midelWares/authHandler.js";


// Example route for trips
router.get("/", getAllTrips);
router.get("/:id", getTripById);
router.post("/admin", requireAdmin, allowedTo("ADMIN"), createTrip);
router.delete("/admin/:id", requireAdmin, allowedTo("ADMIN"), deleteTrip);
router.put("/admin/:id", requireAdmin, allowedTo("ADMIN"), updateTrip);

export default router;
