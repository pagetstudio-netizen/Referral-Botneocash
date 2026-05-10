import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: Number, required: true, index: true },
    referredId: { type: Number, required: true, unique: true },
    referredUsername: { type: String, default: null },
    referredFirstName: { type: String, default: '' },
    amount: { type: Number, required: true },
    // pending = filleul inscrit mais n'a pas encore vérifié les canaux
    // credited = bonus accordé au parrain après vérification du filleul
    status: { type: String, enum: ['pending', 'credited'], default: 'pending', index: true },
    creditedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Referral = mongoose.model('Referral', referralSchema);
export default Referral;
