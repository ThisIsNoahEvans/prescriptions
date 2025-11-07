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
  createdAt: Timestamp;
}

export interface SupplyInfo {
  currentSupply: number;
  runOutDate: Date;
  reorderDate: Date;
  daysRemaining: number;
}

