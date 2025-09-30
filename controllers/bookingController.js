import Booking from "../models/booking.js";
import { bookingEmailHtml, sendBookingEmail } from "../utils/email.js";
import Trip from "../models/trips.js";
import catchAsync from "../utils/catchAsync.js";
//timeZone
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { buildCreatedAtMatch } from "../helpers/filterTime.js";

dayjs.extend(utc);
dayjs.extend(timezone);

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

    let query = {};

    // فلتر البحث بالاسم/الإيميل/الموبايل إلخ
    if (req.query.q && req.query.searchField) {
      query[`user.${req.query.searchField}`] = {
        $regex: req.query.q,
        $options: "i",
      };
    }

    // فلتر النقل
    if (req.query.transferFilter && req.query.transferFilter !== "all") {
      query.transportation = req.query.transferFilter === "yes";
    }

    // فلتر الوقت على createdAt
    const { match: timeMatch, error } = buildCreatedAtMatch(req.query);
    if (error) return res.status(400).json({ message: error });
    if (timeMatch) Object.assign(query, timeMatch);

    const bookings = await Booking.find(query)
      .populate({ path: "tripInfo", select: "name images _id prices" })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: sortOrder })
      .lean();

    const totalBookings = await Booking.countDocuments(query);

    res.status(200).json({
      totalBookings,
      currentPage: page,
      totalPages: Math.ceil(totalBookings / limit),
      sort: req.query.sort || "desc",
      bookings,
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
  const { match: timeMatch, error } = buildCreatedAtMatch(req.query);
  if (error) return res.status(400).json({ message: error });

  const pipeline = [];

  // فلتر الوقت + عدم كون tripInfo null
  pipeline.push({
    $match: Object.assign({ tripInfo: { $ne: null } }, timeMatch || {}),
  });

  pipeline.push(
    {
      $lookup: {
        from: "trips",
        localField: "tripInfo",
        foreignField: "_id",
        as: "trip",
      },
    },
    { $unwind: "$trip" },
    {
      $group: {
        _id: "$trip._id",
        tripName: { $first: "$trip.name" },
        coverImage: { $first: { $arrayElemAt: ["$trip.images", 0] } },
        totalBookings: { $sum: 1 },
        totalEgp: { $sum: { $ifNull: ["$totalPrice.egp", 0] } },
        totalEuro: { $sum: { $ifNull: ["$totalPrice.euro", 0] } },
        createdAt: { $first: "$trip.createdAt" },
        updatedAt: { $first: "$trip.updatedAt" },
        totalTickets: {
          $sum: {
            $add: [{ $ifNull: ["$adult", 0] }, { $ifNull: ["$child", 0] }],
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
        totalTickets: 1,
      },
    },
    { $sort: { totalEgp: -1 } }
  );

  const result = await Booking.aggregate(pipeline);
  return res.status(200).json({ data: result });
});

// all revenue and total booking
export const getTotalBookingsAndRevenue = catchAsync(async (req, res, next) => {
  const { match: timeMatch, error } = buildCreatedAtMatch(req.query);
  if (error) return res.status(400).json({ message: error });

  const pipeline = [];
  if (timeMatch) pipeline.push({ $match: timeMatch });

  pipeline.push(
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
    }
  );

  const [stats = {}] = await Booking.aggregate(pipeline);

  return res.status(200).json({
    totalBookings: stats.totalBookings || 0,
    totalTickets: stats.totalTickets || 0,
    totalEgp: stats.totalEgp || 0,
    totalEuro: stats.totalEuro || 0,
  });
});

// Export bookings to CSV/Excel
import XLSX from "xlsx";
export const exportBookings = catchAsync(async (req, res, next) => {
  const bookings = req.body?.bookings ?? [];

  // 1) Prepare data for Excel
  const excelData = bookings.map((b) => ({
    "اسم العميل": b.user?.firstName ?? "-",
    "رقم الهاتف": b.user?.phone ?? "-",
    "اسم الرحلة": b.tripInfo?.name ?? "-",
    "عدد الكبار ": b.adult ?? "-",
    "عدد الاطفال ": b.child ?? "-",

    " سعر الرحلة للكبار بالمصري": b.tripInfo?.prices?.adult?.egp ?? "-",
    " سعر الرحلة للكبار باليورو": b.tripInfo?.prices?.adult?.euro ?? "-",
    " سعر الرحلة للاطفال بالمصري": b.tripInfo?.prices?.child?.egp ?? "-",
    " سعر الرحلة للاطفال باليورو": b.tripInfo?.prices?.child?.euro ?? "-",
    "  سعر الحجز بالمصري": b.totalPrice?.egp ?? "-",
    "  سعر الحجز باليورو": b.totalPrice?.euro ?? "-",

    مواصلات: b.transportation ? "نعم" : "لا",
    "تاريخ الحجز": b.bookingDate
      ? new Date(b.bookingDate).toLocaleDateString("ar-EG", {
          timeZone: "Africa/Cairo",
        })
      : "-",
    "تاريخ الإنشاء": b.createdAt
      ? new Date(b.createdAt).toLocaleString("ar-EG", {
          timeZone: "Africa/Cairo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-",
  }));

  // 2) Create workbook & worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Optional: set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // اسم العميل
    { wch: 20 }, // رقم الهاتف
    { wch: 20 }, // اسم الرحلة
    { wch: 10 }, // عدد الكبار
    { wch: 10 }, // عدد الاطفال
    { wch: 20 }, // سعر الرحلة بالمصري للكبار
    { wch: 20 }, // سعر الرحلة باليورو للكبار
    { wch: 20 }, // سعر الرحلة بالمصري للاطفال
    { wch: 20 }, // سعر الرحلة باليورو للاطفال
    { wch: 20 }, // سعر الحجز بالمصري
    { wch: 20 }, // سعر الحجز باليورو
    { wch: 12 }, // مواصلات
    { wch: 20 }, // تاريخ الحجز
    { wch: 20 }, // تاريخ الإنشاء
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "الحجوزات");

  // 3) Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  // 4) Return as response
  const date = new Date().toISOString().split("T")[0];
  const filename = `bookings-${date}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(excelBuffer);
});
