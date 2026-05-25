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
    bio: { type: String, trim: true, maxLength: 500 },
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
    phone: this.phone,
    name: this.name,
    role: this.role,
    premium: this.premium,
    premiumActivatedAt: this.premiumActivatedAt,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
  };

  // Only include mentor-specific fields if the user is a mentor
  if (this.role === 'mentor') {
    json.college = this.college;
    json.branch = this.branch;
    json.cgpa = this.cgpa;
    json.state = this.state;
    json.category = this.category;
    json.rank = this.rank;
    json.categoryRank = this.categoryRank;
    json.preferredLang = this.preferredLang;
    json.gender = this.gender;
    json.bundles = this.bundles;
    json.bio = this.bio;
    json.profilePhotoFilename = this.profilePhotoFilename;
    json.idDocFilename = this.idDocFilename;
    json.verificationStatus = this.verificationStatus;
  }

  return json;
};

export const User = mongoose.model('User', userSchema);
