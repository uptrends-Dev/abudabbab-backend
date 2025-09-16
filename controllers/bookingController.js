import Booking from "../models/booking.js";
import { bookingEmailHtml, sendBookingEmail } from "../utils/email.js";
import Trip from "../models/trips.js";
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
        subject: `تأكيد الحجز - ${trip.name || "رحلة"}`,
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
