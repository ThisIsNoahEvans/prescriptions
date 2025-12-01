import { Timestamp } from 'firebase/firestore';

export interface SupplyLogEntry {
  date: Timestamp;
  quantity: number;
}

export interface Prescription {
  id: string;
  name: string;
  packSize: number;
  dailyDose: number;
  startDate: Timestamp;
  startSupply: number;
  supplyLog: SupplyLogEntry[];
  photoUrls?: string[]; // Array of Firebase Storage URLs for medication photos
  categoryId?: string; // Optional category ID
  notes?: string; // Optional notes
  emailThresholds?: number[]; // Array of days before run out date to send email reminders (e.g., [10, 5])
  reorderBufferDays?: number; // Number of days before run out date to reorder (based on delivery time, e.g., 10 for 10-day delivery, 1 for next-day)
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  color: string; // Hex color code
  createdAt: Timestamp;
}

export interface SupplyInfo {
  currentSupply: number;
  runOutDate: Date;
  reorderDate: Date;
  daysRemaining: number;
}

