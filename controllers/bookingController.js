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
// export const createBooking = async (req, res) => {
//   try {
//     const newBooking = { ...req.body };

//     // دعم انتقال: لو جاية tripId من الفرونت، حوّلها لـ tripInfo
//     if (!newBooking.tripInfo && newBooking.tripId) {
//       newBooking.tripInfo = newBooking.tripId;
//       delete newBooking.tripId;
//     }

//     // تأكيد وجود الرحلة
//     const trip = await Trip.findById(newBooking.tripInfo).lean();
//     if (!trip) return res.status(404).json({ message: "الرحلة غير موجودة" });

//     // حفظ الحجز
//     const booking = await Booking.create(newBooking);

//     // populate بالاسم والصور فقط
//     const populatedBooking = await Booking.findById(booking._id)
//       .populate({ path: "tripInfo", select: "name images _id" })
//       .lean();

//     // استخدم البيانات المأهولة في الإيميل
//     const html = bookingEmailHtml(populatedBooking, trip);

//     try {
//       await sendBookingEmail({
//         to: booking.user.email,
//         subject: `Booking Confirmation - ${trip.name || "trip"}`,
//         html,
//       });

//       return res.status(201).json({
//         message: "تم إنشاء الحجز وإرسال التذكرة على الإيميل",
//         booking: populatedBooking,
//         emailSent: true,
//       });
//     } catch (mailErr) {
//       return res.status(201).json({
//         message:
//           "تم إنشاء الحجز، لكن فشل إرسال الإيميل. برجاء التواصل مع الدعم.",
//         booking: populatedBooking,
//         emailSent: false,
//       });
//     }
//   } catch (error) {
//     return res.status(500).json({ message: "Failed to create booking", error });
//   }
// };
// controller
import QRCode from "qrcode";
// ... باقي الاستيرادات
// create Booking
export const createBooking = async (req, res) => {
  try {
    const newBooking = { ...req.body };

    if (!newBooking.tripInfo && newBooking.tripId) {
      newBooking.tripInfo = newBooking.tripId;
      delete newBooking.tripId;
    }

    const trip = await Trip.findById(newBooking.tripInfo).lean();
    if (!trip) return res.status(404).json({ message: "الرحلة غير موجودة" });

    const booking = await Booking.create(newBooking);

    const populatedBooking = await Booking.findById(booking._id)
      .populate({ path: "tripInfo", select: "name images _id" })
      .lean();

    // ====== QR ======
    const ref = booking._id.toString().slice(-8).toUpperCase();
    const qrCid = `ticketqr_${ref}`;

    // محتوى الـ QR: اختَر واحد
    // 1) نص محسّن (سهل الاستخدام أوفلاين):
    const payload = JSON.stringify({
      v: 1,
      bid: String(booking._id),
      ref,
      trip: trip.name,
      date: booking.bookingDate,
    });

    // 2) أو لينك تحقق (لو عندك صفحة تحقق/تشيك-إن):
    // const base = process.env.PUBLIC_BASE_URL || "https://example.com";
    // const payload = `${base}/ticket/${booking._id}?ref=${ref}`;

    // إنشاء الصورة
    const qrPayload = JSON.stringify({ bid: String(booking._id) }); // 👈 بس الـ id
    const qrPng = await QRCode.toBuffer(qrPayload, {
      type: "png",
      errorCorrectionLevel: "H",
      width: 600,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    // HTML مع إدراج الـ QR عبر cid
    const html = bookingEmailHtml(populatedBooking, trip, { qrCid });

    try {
      await sendBookingEmail({
        to: booking.user.email,
        subject: `Booking Confirmation - ${trip.name || "trip"}`,
        html,
        attachments: [
          {
            filename: `ticket-${ref}.png`,
            content: qrPng,
            cid: qrCid, // 👈 لازم يطابق اللي في HTML
            contentType: "image/png",
          },
        ],
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

    // فلتر حالة الدفع (yes/no/all)
    if (req.query.payment && req.query.payment !== "all") {
      // دعم قيم 'yes'/'no' أو 'true'/'false'
      const p = req.query.payment.toLowerCase();
      query.payment = p === "yes" || p === "true";
    }

    // فلتر التشيك إن (checkIn) (yes/no/all)
    if (req.query.checkIn && req.query.checkIn !== "all") {
      const c = req.query.checkIn.toLowerCase();
      query.checkIn = c === "yes" || c === "true";
    }

    // فلتر باسم الرحلة (يجري بحث جزئي وحساس لحالة الأحرف)
    if (req.query.tripName) {
      const trips = await Trip.find(
        { name: { $regex: req.query.tripName, $options: "i" } },
        "_id"
      ).lean();
      const tripIds = trips.map((t) => t._id);

      // لو مافيش رحلات مطابقة، رجّع نتيجة فارغة سريعة
      if (tripIds.length === 0) {
        return res.status(200).json({
          totalBookings: 0,
          currentPage: page,
          totalPages: 0,
          sort: req.query.sort || "desc",
          bookings: [],
        });
      }

      query.tripInfo = { $in: tripIds };
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

export const updateBookingState = async (req, res) => {
  const { id } = req.params; // booking ID
  const { payment, checkIn } = req.body;
  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "الحجز غير موجود" });
    }

    if (payment !== undefined) {
      booking.payment = payment;
    }

    if (checkIn !== undefined) {
      booking.checkIn = checkIn;
    }

    if (booking.payment && booking.checkIn) {
      booking.status = true;
    }
    await booking.save();

    res.status(200).json({
      message: "تم تحديث حالة الدفع والتشيك إن بنجاح",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "حدث خطأ أثناء تحديث الحجز", error });
  }
};

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
    "  حالة الدفع": b.payment ? "نعم" : "لا",
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
