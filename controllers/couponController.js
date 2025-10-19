// Remember to import the Coupon model and AppError at the top of this file

import Coupon from "../models/coupon.js";
import AppError from "../utils/AppError.js";

export const createCoupon = async (req, res, next) => {
  try {
    const newCoupon = await Coupon.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        coupon: newCoupon,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({
      status: "success",
      results: coupons.length,
      data: {
        coupons,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return next(new AppError("No coupon found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        coupon,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,  // Ensure validators are run on update
    });
    if (!coupon) {
      return next(new AppError("No coupon found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        coupon,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return next(new AppError("No coupon found with that ID", 404));
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};


export const toggleCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return next(new AppError("No coupon found with that ID", 404));
    }

    // Toggle the active status
    coupon.active = !coupon.active;

    // Save the updated coupon
    await coupon.save();

    res.status(200).json({
      status: "success",
      data: {
        coupon,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const { code } = req.params;
    const coupon = await Coupon.findOne({ code, active: true });

    if (!coupon) {
      return next(new AppError("Invalid or inactive coupon code", 400));
    }

    if (coupon.expirationDate < new Date()) {
      return next(new AppError("Coupon has expired", 400));
    }

    res.status(200).json({
      status: "success",
      data: {
        discount: coupon.discount,
        type: coupon.type,
      },
    });
  } catch (error) {
    next(error);
  }
}