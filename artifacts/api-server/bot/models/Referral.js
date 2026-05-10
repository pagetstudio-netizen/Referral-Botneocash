import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: Number, required: true, index: true },
    referredId: { type: Number, required: true, unique: true },
    referredUsername: { type: String, default: null },
    referredFirstName: { type: String, default: '' },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

const Referral = mongoose.model('Referral', referralSchema);
export default Referral;
