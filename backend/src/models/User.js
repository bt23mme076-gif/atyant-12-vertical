import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
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
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    // Mentor-specific fields
    college: { type: String, trim: true },
    state: { type: String, trim: true },
    rank: { type: Number },
    bundles: [{ type: String }],
    bio: { type: String, trim: true, maxLength: 500 },
    profilePhotoFilename: { type: String },
    idDocFilename: { type: String },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'none'],
      default: 'none',
    },
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
  return {
    id: this._id,
    email: this.email,
    phone:this.phone,
    name: this.name,
    role: this.role,
    college: this.college,
    state: this.state,
    rank: this.rank,
    bundles: this.bundles,
    bio: this.bio,
    profilePhotoFilename: this.profilePhotoFilename,
    idDocFilename: this.idDocFilename,
    verificationStatus: this.verificationStatus,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
  };
};

export const User = mongoose.model('User', userSchema);
