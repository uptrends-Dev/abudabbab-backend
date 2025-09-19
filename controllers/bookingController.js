import Booking from "../models/booking.js";
import { bookingEmailHtml, sendBookingEmail } from "../utils/email.js";

import Trip from "../models/trips.js";
import catchAsync from "../utils/catchAsync.js";

// Create a new booking + send email ticket
export const createBooking = async (req, res) => {
  try {
    const newBooking = { ...req.body };

    // دعم انتقال: لو جاية tripId من الفرونت، حوّلها لـ tripInfo
    if (!newBooking.tripInfo && newBooking.tripId) {
      newBooking.tripInfo = newBooking.tripId;
      delete newBooking.tripId;
    }

    // تأكيد وجود الرحلة
    const trip = await Trip.findById(newBooking.tripInfo).lean();
    if (!trip) return res.status(404).json({ message: "الرحلة غير موجودة" });

    // حفظ الحجز
    const booking = await Booking.create(newBooking);

    // populate بالاسم والصور فقط
    const populatedBooking = await Booking.findById(booking._id)
      .populate({ path: "tripInfo", select: "name images _id" })
      .lean();

    // استخدم البيانات المأهولة في الإيميل
    const html = bookingEmailHtml(populatedBooking, trip);

    try {
      await sendBookingEmail({
        to: booking.user.email,
        subject: `Booking Confirmation - ${trip.name || "trip"}`,
        html,
      });

      return res.status(201).json({
        message: "تم إنشاء الحجز وإرسال التذكرة على الإيميل",
        booking: populatedBooking,
        emailSent: true,
      });
    } catch (mailErr) {
      return res.status(201).json({
        message:
          "تم إنشاء الحجز، لكن فشل إرسال الإيميل. برجاء التواصل مع الدعم.",
        booking: populatedBooking,
        emailSent: false,
      });
    }
  } catch (error) {
    return res.status(500).json({ message: "Failed to create booking", error });
  }
};

// Get all bookings
export const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortOrder = req.query.sort === "asc" ? 1 : -1;

    const bookings = await Booking.find()
      .populate({ path: "tripInfo", select: "name images _id" })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: sortOrder })
      .lean();

    const totalBookings = await Booking.countDocuments();

    res.status(200).json({
      totalBookings,
      currentPage: page,
      totalPages: Math.ceil(totalBookings / limit),
      sort: req.query.sort || "desc",
      bookings, // tripInfo موجود جاهز بالاسم والصور فقط
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve bookings", error });
  }
};

// Get booking by ID with trip details
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate({ path: "tripInfo", select: "name images -_id" })
      .lean();

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve booking", error });
  }
};



// display total booking for each trip
// revenue for each trip

export const advancedTripsInfos = catchAsync(async (req, res, next) => {
  const bookings = await Booking.aggregate([
    {
      $match: {
        tripInfo: { $ne: null }, // تأكد أن tripInfo ليس فارغًا
      },
    },
    {
      $lookup: {
        from: "trips", // اسم مجموعة الرحلات
        localField: "tripInfo", // الحقل الذي يحتوي على ObjectId للرحلة
        foreignField: "_id", // الحقل الذي يحتوي على الـ ObjectId في مجموعة الرحلات
        as: "tripDetails", // اسم الحقل الذي سيحتوي على بيانات الرحلة بعد الربط
      },
    },
    {
      $unwind: "$tripDetails", // لفك العناصر المرتبطة بالرحلة
    },
    {
      $group: {
        _id: "$tripDetails.name", // تجميع البيانات حسب اسم الرحلة
        totalBookings: { $sum: 1 }, // عد عدد الحجوزات
        totalEgp: { $sum: "$totalPrice.egp" }, // جمع إجمالي EGP
        totalEuro: { $sum: "$totalPrice.euro" }, // جمع إجمالي اليورو
      },
    },
    {
      $project: {
        tripName: "$_id", // عرض اسم الرحلة
        totalBookings: 1, // عرض عدد الحجوزات
        totalEgp: 1, // عرض إجمالي الـ EGP
        totalEuro: 1, // عرض إجمالي اليورو
      },
    },
  ]);
  if (!bookings || bookings.length === 0) {
    return next(new AppError("No booking found", 404));
  }

  res.status(200).json(bookings);
});

// all revenue and total booking
export const getTotalBookingsAndRevenue = catchAsync(async (req, res, next) => {
  const bookings = await Booking.aggregate([
    {
      $group: {
        _id: null, // لا نقوم بتجميع حسب أي حقل، نقوم بحساب الإجمالي لكل البيانات
        totalBookings: { $sum: 1 }, // حساب إجمالي عدد الحجوزات
        totalEgp: { $sum: "$totalPrice.egp" }, // حساب إجمالي الـ EGP
        totalEuro: { $sum: "$totalPrice.euro" }, // حساب إجمالي اليورو
      },
    },
    {
      $project: {
        totalBookings: 1, // عرض إجمالي الحجوزات
        totalEgp: 1, // عرض إجمالي الـ EGP
        totalEuro: 1, // عرض إجمالي اليورو
      },
    },
  ]);
  if (!bookings || bookings.length === 0) {
    return next(new AppError("No booking found", 404));
  }

  res.status(200).json(bookings);
});
