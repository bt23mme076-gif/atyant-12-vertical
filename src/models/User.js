import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'mentor'],
      default: 'student',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    // Mentor-specific fields
    college: { type: String, trim: true },
    branch: { type: String, trim: true },
    cgpa: { type: Number },
    state: { type: String, trim: true },
    category: { type: String, trim: true },
    rank: { type: Number },
    categoryRank: { type: Number },
    preferredLang: { type: String, trim: true },
    gender: { type: String, trim: true },
    bundles: [{ type: String }],
    bio: { type: String, trim: true, maxLength: 5000 },
    profilePhotoFilename: { type: String },
    idDocFilename: { type: String },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'none'],
      default: 'none',
    },
    premium: { type: Boolean, default: false },
    premiumActivatedAt: { type: Date },
    lastLoginAt: Date,

    // ─── Single-device login ───────────────────────────────────────────
    // A random id minted on every successful login and embedded in the JWT
    // as `sid`. Any older token whose `sid` no longer matches is rejected,
    // which effectively logs the user out everywhere else.
    activeSessionId: { type: String, default: null },
    activeDeviceInfo: { type: String, trim: true, default: '' },

    // ─── Batch / cohort ─────────────────────────────────────────────────
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },

    // ─── Streak tracking ────────────────────────────────────────────────
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCheckInDate: { type: Date, default: null },

    // ─── Roadmap progress ───────────────────────────────────────────────
    roadmapProgress: [
      {
        pillar: { type: mongoose.Schema.Types.ObjectId, ref: 'RoadmapPillar' },
        completedItems: [{ type: mongoose.Schema.Types.ObjectId }],
        percent: { type: Number, default: 0 },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    overallProgress: { type: Number, default: 0 },

    // ─── Referral system (phase 2 wiring, safe to keep dormant) ────────
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  const json = {
    id: this._id,
    email: this.email,
    phone: this.phone || '',
    name: this.name || '',
    role: this.role,
    premium: this.premium,
    premiumActivatedAt: this.premiumActivatedAt,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
    batch: this.batch || null,
    currentStreak: this.currentStreak || 0,
    longestStreak: this.longestStreak || 0,
    lastCheckInDate: this.lastCheckInDate || null,
    overallProgress: this.overallProgress || 0,
    referralCode: this.referralCode || '',
    referralCount: this.referralCount || 0,
  };

  // Only include mentor-specific fields if the user is a mentor
  if (this.role === 'mentor') {
    json.college = this.college || '';
    json.branch = this.branch || '';
    json.cgpa = this.cgpa || null;
    json.state = this.state || '';
    json.category = this.category || '';
    json.rank = this.rank || null;
    json.categoryRank = this.categoryRank || null;
    json.preferredLang = this.preferredLang || '';
    json.gender = this.gender || '';
    json.bundles = Array.isArray(this.bundles) ? this.bundles : [];
    json.bio = this.bio || '';
    json.profilePhotoFilename = this.profilePhotoFilename || '';
    json.idDocFilename = this.idDocFilename || '';
    json.verificationStatus = this.verificationStatus || 'none';
  }

  return json;
};

export const User = mongoose.model('User', userSchema);