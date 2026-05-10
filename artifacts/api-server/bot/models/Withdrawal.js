import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },
    telegramId: { type: Number, required: true },
    firstName: { type: String, default: '' },
    username: { type: String, default: null },
    country: { type: String, required: true },
    countryName: { type: String, required: true },
    operator: { type: String, required: true },
    phone: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, default: null },
    processedAt: { type: Date, default: null },
    processedBy: { type: Number, default: null },
  },
  { timestamps: true }
);

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
export default Withdrawal;
