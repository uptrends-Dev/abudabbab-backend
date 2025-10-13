import jwt from "jsonwebtoken";
import { issueSession, revokeSession, verifyAdmin } from "../helpers/auth.js";
import AppError from "../utils/AppError.js";
import AdminUser from "../models/adminUsers.js";
import bcrypt from "bcryptjs";


export async function register(req, res, next) {
  try {
    const {
      username,
      email,
      password,
      role = "EMPLOYEE",
      profilePicture = "",
      bio = "",
      phoneNumber = "",
      address = "",
      // isActive, lastLogin  // generally not set by clients on register; schema defaults will handle
    } = req.body || {};

    // Basic required fields
    if (!username || !email || !password) {
      return next(new AppError("Username, email, and password are required", 400));
    }

    // Normalize/trim
    const normUsername = String(username).trim();
    const normEmail = String(email).trim().toLowerCase();

    if (!normUsername) {
      return next(new AppError("Username cannot be empty", 400));
    }
    if (!normEmail) {
      return next(new AppError("Email cannot be empty", 400));
    }

    // Validate role against enum
    const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "GATE"];
    if (role && !ALLOWED_ROLES.includes(role)) {
      return next(new AppError(`Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}`, 400));
    }

    // Check for existing user by username OR email
    const existing = await AdminUser.findOne({
      $or: [{ email: normEmail }, { username: normUsername }],
    });

    if (existing) {
      // Tell which field conflicts (without leaking too much)
      const field =
        existing.email === normEmail ? "email" :
          existing.username === normUsername ? "username" : "credentials";
      return next(new AppError(`An account with this ${field} already exists`, 409));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user (schema will enforce uniqueness & defaults)
    const newAdmin = new AdminUser({
      username: normUsername,
      email: normEmail,
      password: hashedPassword,
      role,                 // default is EMPLOYEE per schema if not provided
      profilePicture,
      bio,
      phoneNumber,
      address,
      // isActive defaults to true; lastLogin defaults to Date.now per schema
    });

    await newAdmin.save();

    // Respond without sensitive fields
    res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        isActive: newAdmin.isActive,
        createdAt: newAdmin.createdAt,
        updatedAt: newAdmin.updatedAt,
      },
    });
  } catch (err) {
    // Handle duplicate key errors (race conditions / unique index violations)
    if (err?.code === 11000) {
      const dupField = Object.keys(err.keyPattern || {})[0] || "field";
      return next(new AppError(`An account with this ${dupField} already exists`, 409));
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return next(new AppError("Email and password are required", 400));

    const admin = await verifyAdmin(email, password);
    if (!admin) return next(new AppError("Invalid credentials", 401));

    const token = jwt.sign({ username: admin.username, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    issueSession({ username: admin.username, role: admin.role }, token);

    res
      .cookie("access_token", token, {
        httpOnly: true,
        secure: true, // true if in production
        sameSite: "none",
        // domain: ".vercel.app",// share across subdomains; omit or set correctly
        path: "/",
      })
      .status(200)
      .json({
        access_token: token,
        token_type: "Bearer",
        // expires_in: ttlSec,
        user: { username: admin.username, email: admin.email, role: admin.role || [] },
      });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    res
      .clearCookie("access_token", {
        httpOnly: true,
        secure: true, // true if in production
        sameSite: "none",
        domain: ".vercel.app",// share across subdomains; omit or set correctly
        path: "/",
      });

    // Optionally revoke session server-side
    revokeSession(req.admin.token);
    // jwt.destroy(req.admin.token);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export function getMe(req, res) {
  res.json({
    username: req.admin.username,
    role: req.admin.role,
  });
}


export async function getAllUsers(req, res, next) {
  try {
    const users = await AdminUser.find({}, '-password'); // Exclude password field
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}


// import AppError and AdminUser as you already do

export async function updateUser(req, res, next) {
  try {
    const { id, password, ...updates } = req.body || {};
    if (!id) return next(new AppError("User ID is required", 400));

    // Prevent updating sensitive fields directly
    delete updates.isActive;
    delete updates.lastLogin;

    // If email or username is being updated, check for uniqueness
    if (updates.email) {
      const existingEmail = await AdminUser.findOne({ email: updates.email, _id: { $ne: id } });
      if (existingEmail) return next(new AppError("Email already in use", 409));
    }
    if (updates.username) {
      const existingUsername = await AdminUser.findOne({ username: updates.username, _id: { $ne: id } });
      if (existingUsername) return next(new AppError("Username already in use", 409));
    }

    const user = await AdminUser.findById(id);
    if (!user) return next(new AppError("User not found", 404));

    // Assign non-password fields
    Object.assign(user, updates);

    // If password provided, hash and set it
    if (typeof password === "string" && password.trim().length) {
      const saltRounds = 10; // adjust as needed
      user.password = await bcrypt.hash(password.trim(), saltRounds);
      // Optional: mark password changed timestamp if your schema uses it
      if ("passwordChangedAt" in user) {
        user.passwordChangedAt = new Date();
      }
    }

    await user.save({ validateModifiedOnly: true });

    const safe = user.toObject();
    delete safe.password;

    res.status(200).json({
      message: "User updated successfully",
      user: safe,
    });
  } catch (err) {
    // Handle duplicate key errors
    if (err?.code === 11000) {
      const dupField = Object.keys(err.keyPattern || {})[0] || "field";
      return next(new AppError(`An account with this ${dupField} already exists`, 409));
    }
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.body || {};
    // console.log(req.body)
    if (!id) return next(new AppError("User ID is required", 400));

    // if (req.admin.role === "SUPER_ADMIN") {
    //   return next(new AppError("You cannot delete your own super account", 400));
    // }

    const deletedUser = await AdminUser.findByIdAndDelete(id).select('-password');
    if (!deletedUser) return next(new AppError("User not found", 404));

    res.status(200).json({
      message: "User deleted successfully",
      user: deletedUser,
    });
  } catch (err) {
    next(err);
  }
}
