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
    const sortOrder = req.query.sort === "asc" ? 1 : -1; //sorting Newest & Oldest

    // Initial query to fetch bookings
    let query = {};

    // Filter by transportation (yes/no)
    if (req.query.transportation) {
      const transportation =
        req.query.transportation.toLowerCase() === "yes" ? true : false;
      query.transportation = transportation;
    }

    // Filter by trip name (search trip name)
    if (req.query.tripName) {
      query["tripInfo.name"] = { $regex: req.query.tripName, $options: "i" }; // Case insensitive search
    }

    const bookings = await Booking.find(query) // Apply filters here
      .populate({ path: "tripInfo", select: "name images _id prices" })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: sortOrder })
      .lean();

    const totalBookings = await Booking.countDocuments(query); // Apply filters to count as well

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
  const result = await Booking.aggregate([
    { $match: { tripInfo: { $ne: null } } },
    {
      $lookup: {
        from: "trips", // collection: trips
        localField: "tripInfo",
        foreignField: "_id",
        as: "trip",
      },
    },
    { $unwind: "$trip" },
    {
      $group: {
        _id: "$trip._id", // التجميع على الـ trip id
        tripName: { $first: "$trip.name" },
        coverImage: { $first: { $arrayElemAt: ["$trip.images", 0] } },
        totalBookings: { $sum: 1 },
        totalEgp: { $sum: { $ifNull: ["$totalPrice.egp", 0] } },
        totalEuro: { $sum: { $ifNull: ["$totalPrice.euro", 0] } },
        createdAt: { $first: "$trip.createdAt" }, // إضافة حقل createdAt
        updatedAt: { $first: "$trip.updatedAt" }, // إضافة حقل updatedAt
        totalTickets: {
          $sum: {
            $add: [
              { $ifNull: ["$adult", 0] }, // إضافة عدد البالغين
              { $ifNull: ["$child", 0] }, // إضافة عدد الأطفال
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        tripId: "$_id",
        tripName: 1,
        coverImage: 1,
        totalBookings: 1,
        totalEgp: 1,
        totalEuro: 1,
        createdAt: 1,
        updatedAt: 1,
        totalTickets: 1, // تضمين مجموع التذاكر في النتيجة
      },
    },
    { $sort: { totalEgp: -1 } }, // ترتيب اختياري
  ]);

  // رجّع Array فاضية بدل 404 — أسهل للواجهات
  return res.status(200).json({ data: result });
});

// all revenue and total booking
export const getTotalBookingsAndRevenue = catchAsync(async (req, res, next) => {
  const [stats = {}] = await Booking.aggregate([
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalTickets: {
          $sum: {
            $add: [{ $ifNull: ["$adult", 0] }, { $ifNull: ["$child", 0] }],
          },
        },
        totalEgp: { $sum: { $ifNull: ["$totalPrice.egp", 0] } },
        totalEuro: { $sum: { $ifNull: ["$totalPrice.euro", 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        totalBookings: 1,
        totalTickets: 1,
        totalEgp: 1,
        totalEuro: 1,
      },
    },
  ]);

  // لو مافيش حجوزات، رجّع صفرات
  return res.status(200).json({
    totalBookings: stats.totalBookings || 0,
    totalTickets: stats.totalTickets || 0,
    totalEgp: stats.totalEgp || 0,
    totalEuro: stats.totalEuro || 0,
  });
});
