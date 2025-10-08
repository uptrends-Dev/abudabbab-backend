import express from "express";
const router = express.Router();
import {
  getAllTrips,
  getTripById,
  createTrip,
  deleteTrip,
  updateTrip,
} from "../controllers/tripsControler.js";
import { requireAdmin } from "../helpers/auth.js";

// Example route for trips
router.get("/", getAllTrips);
router.get("/:id",requireAdmin, getTripById);
router.post("/admin",requireAdmin, createTrip);
router.delete("/admin/:id",requireAdmin, deleteTrip);
router.put("/admin/:id",requireAdmin, updateTrip);

export default router;
