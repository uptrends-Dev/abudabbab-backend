import express from "express";
const router = express.Router();
import {
  getAllTrips,
  getTripById,
  createTrip,
  deleteTrip,
  updateTrip,
} from "../controllers/tripsControler.js";
// Example route for trips
router.get("/", getAllTrips);

router.get("/:id", getTripById);
router.post("/admin", createTrip);
router.delete("/admin/:id", deleteTrip);
router.put("/admin/:id", updateTrip);
export default router;
