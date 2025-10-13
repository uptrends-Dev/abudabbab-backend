import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["SUPER_ADMIN", "FINANCE", "ADMIN", "EMPLOYEE", "GATE"],
      default: "EMPLOYEE",
    },
    isActive: { type: Boolean, default: true }, // لتحديد ما إذا كان المستخدم نشطًا أم لا
    profilePicture: { type: String, default: "" }, // رابط الصورة الشخصية
    bio: { type: String, default: "" }, // سيرة ذاتية قصيرة للمستخدم
    phoneNumber: { type: String, default: "" }, // رقم الهاتف
    address: { type: String, default: "" }, // عنوان المستخدم
    lastLogin: { type: Date, default: Date.now }, // تاريخ آخر تسجيل دخول
  },
  { timestamps: true }
);


const AdminUser = mongoose.model('AdminUser', adminSchema);

export default AdminUser;