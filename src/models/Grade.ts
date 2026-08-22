import mongoose from 'mongoose';

/**
 * Grade Model - Reference Collection
 * 
 * One document per unique normalizedGrade, containing all raw description
 * variants seen for that grade, aggregates, and metadata.
 */

export interface IDescriptionVariant {
  rawDescription: string;
  occurrenceCount: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface IGrade extends mongoose.Document {
  normalizedGrade: string;       // unique, e.g., "LLDPE Q1018H"
  polymerType: string;           // LLDPE | LDPE | HDPE | MDPE | PP
  gradeCode: string;             // e.g., "Q1018H"
  descriptionVariants: IDescriptionVariant[];
  totalRecords: number;          // count of matching records
  totalQuantity: number;         // sum of Quantity across all matching records
  totalAssessedValuePKR: number; // sum of TOTAL PKR VALU ASSESSED
  firstSeen: Date;
  lastSeen: Date;
  updatedAt: Date;
}

const DescriptionVariantSchema = new mongoose.Schema({
  rawDescription: { type: String, required: true },
  occurrenceCount: { type: Number, default: 1 },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
}, { _id: false });

const GradeSchema = new mongoose.Schema<IGrade>({
  normalizedGrade: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  polymerType: {
    type: String,
    enum: ['LLDPE', 'LDPE', 'HDPE', 'MDPE', 'PP'],
    required: true,
    index: true,
  },
  gradeCode: {
    type: String,
    required: true,
    index: true,
  },
  descriptionVariants: [DescriptionVariantSchema],
  totalRecords: {
    type: Number,
    default: 0,
  },
  totalQuantity: {
    type: Number,
    default: 0,
  },
  totalAssessedValuePKR: {
    type: Number,
    default: 0,
  },
  firstSeen: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
GradeSchema.index({ polymerType: 1, gradeCode: 1 });
GradeSchema.index({ totalRecords: -1 });

export default mongoose.models.Grade || mongoose.model<IGrade>('Grade', GradeSchema);
