import mongoose from 'mongoose';

const TempCSVDataSchema = new mongoose.Schema({
  headers: [{ type: String }],
  data: [{ type: mongoose.Schema.Types.Mixed }],
  createdAt: { type: Date, default: Date.now, expires: '1h' }, // Auto-delete after 1 hour
});

export default mongoose.models.TempCSVData || mongoose.model('TempCSVData', TempCSVDataSchema);