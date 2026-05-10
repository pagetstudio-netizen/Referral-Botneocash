import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },
    type: {
      type: String,
      enum: ['referral_bonus', 'daily_bonus', 'withdrawal', 'admin_credit', 'admin_debit'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    description: { type: String, default: '' },
    referenceId: { type: String, default: null },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
