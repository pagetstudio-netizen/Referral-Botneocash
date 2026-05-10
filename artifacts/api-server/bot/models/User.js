import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, default: null },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    balance: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, index: true },
    referredBy: { type: Number, default: null },
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    bonusEarnings: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    lastBonusAt: { type: Date, default: null },
    banned: { type: Boolean, default: false },
    bannedReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    lastActivityAt: { type: Date, default: Date.now },
    waitingForSupport: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
};

userSchema.methods.canClaimBonus = function () {
  if (!this.lastBonusAt) return true;
  const now = new Date();
  const diff = now - new Date(this.lastBonusAt);
  return diff >= 24 * 60 * 60 * 1000;
};

userSchema.methods.timeUntilNextBonus = function () {
  if (!this.lastBonusAt) return 0;
  const now = new Date();
  const next = new Date(this.lastBonusAt.getTime() + 24 * 60 * 60 * 1000);
  const diff = next - now;
  return diff > 0 ? diff : 0;
};

const User = mongoose.model('User', userSchema);
export default User;
