import mongoose from 'mongoose';

/**
 * GradeOverride Model
 * 
 * Stores manual overrides for grade extraction when automatic detection fails
 * or produces incorrect results. Overrides take priority over automatic extraction.
 */

export interface IGradeOverride extends mongoose.Document {
  matchPattern: string;      // substring or regex to match against description
  matchType: 'substring' | 'regex';
  normalizedGrade: string;   // corrected value to apply
  note?: string;             // why this override exists
  createdAt: Date;
  updatedAt: Date;
}

const GradeOverrideSchema = new mongoose.Schema<IGradeOverride>({
  matchPattern: {
    type: String,
    required: true,
    index: true,
  },
  matchType: {
    type: String,
    enum: ['substring', 'regex'],
    required: true,
    default: 'substring',
  },
  normalizedGrade: {
    type: String,
    required: true,
    index: true,
  },
  note: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound index for efficient lookups
GradeOverrideSchema.index({ matchType: 1, matchPattern: 1 });

export default mongoose.models.GradeOverride || mongoose.model<IGradeOverride>('GradeOverride', GradeOverrideSchema);
