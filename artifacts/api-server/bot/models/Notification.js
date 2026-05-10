import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'new_user',
        'withdrawal_request',
        'withdrawal_approved',
        'withdrawal_rejected',
        'user_banned',
        'new_referral',
        'broadcast',
        'error',
      ],
      required: true,
    },
    message: { type: String, required: true },
    userId: { type: Number, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    sent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
