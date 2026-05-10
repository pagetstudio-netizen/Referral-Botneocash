import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String, default: null },
    firstName: { type: String, default: '' },
    addedBy: { type: Number, default: null },
    isSuperAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
