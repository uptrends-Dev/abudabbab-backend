import { Router } from "express";
import { createCoupon, deleteCoupon, getAllCoupons, getCoupon, toggleCoupon, updateCoupon, validateCoupon } from "../controllers/couponController.js";
import { allowedTo, requireAdmin } from "../midelWares/authHandler.js";



const couponRouter = Router();

// Define coupon-related routes here
couponRouter.post("/", requireAdmin, allowedTo("admin"), createCoupon);
couponRouter.get("/", requireAdmin, allowedTo("admin"), getAllCoupons);
couponRouter.get("/:id", requireAdmin, allowedTo("admin"), getCoupon);
couponRouter.put("/:id", requireAdmin, allowedTo("admin"), updateCoupon);
couponRouter.delete("/:id", requireAdmin, allowedTo("admin"), deleteCoupon);
couponRouter.patch("/:id/toggle", requireAdmin, allowedTo("admin"), toggleCoupon);
couponRouter.get("/validate/:code", validateCoupon);

export default couponRouter;