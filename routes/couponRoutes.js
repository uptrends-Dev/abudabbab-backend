import { Router } from "express";
import { createCoupon, deleteCoupon, getAllCoupons, getCoupon, toggleCoupon, updateCoupon, validateCoupon } from "../controllers/couponController.js";
import { allowedTo, requireAdmin } from "../midelWares/authHandler.js";



const couponRouter = Router();

// Define coupon-related routes here
couponRouter.post("/", requireAdmin, allowedTo("ADMIN"), createCoupon);
couponRouter.get("/", requireAdmin, allowedTo("ADMIN"), getAllCoupons);
couponRouter.get("/:id", requireAdmin, allowedTo("ADMIN"), getCoupon);
couponRouter.put("/:id", requireAdmin, allowedTo("ADMIN"), updateCoupon);
couponRouter.delete("/:id", requireAdmin, allowedTo("ADMIN"), deleteCoupon);
couponRouter.patch("/:id/toggle", requireAdmin, allowedTo("ADMIN"), toggleCoupon);
couponRouter.get("/validate/:code", validateCoupon);

export default couponRouter;