import { normalizeDate, dateDiffInDays, addDays } from './dateUtils';

const REORDER_BUFFER_DAYS = 10;

export interface PrescriptionData {
  id: string;
  name: string;
  packSize: number;
  dailyDose: number;
  startDate: FirebaseFirestore.Timestamp;
  startSupply: number;
  supplyLog: Array<{
    date: FirebaseFirestore.Timestamp;
    quantity: number;
  }>;
  emailThresholds?: number[]; // Array of days before run out date
  reorderBufferDays?: number; // Number of days before run out date to reorder (based on delivery time)
}

export interface SupplyInfo {
  currentSupply: number;
  runOutDate: Date;
  reorderDate: Date;
  daysRemaining: number;
}

/**
 * Calculates supply information for a prescription.
 */
export function calculateSupplyInfo(prescription: PrescriptionData): SupplyInfo {
  try {
    const today = normalizeDate(new Date());
    const startDate = normalizeDate(prescription.startDate.toDate());
    const dailyDose = prescription.dailyDose;

    // 1. Calculate total supply added
    let totalAdded = prescription.startSupply;
    prescription.supplyLog.forEach((log) => {
      totalAdded += log.quantity;
    });

    // 2. Calculate total consumed based on days passed
    // Always include today's dose in the calculation for consistency
    // This ensures the supply shown is "after today" regardless of time of day
    const daysPassed = dateDiffInDays(today, startDate);
    const daysIncludingToday = daysPassed < 0 ? 1 : daysPassed + 1; // Add 1 to include today
    const totalConsumed = daysIncludingToday * dailyDose;

    // 3. Calculate current supply
    const currentSupply = totalAdded - totalConsumed;

    // 4. Calculate future dates
    const daysRemaining = dailyDose > 0 ? Math.floor(currentSupply / dailyDose) : 9999;
    const runOutDate = addDays(today, daysRemaining);
    
    // Use prescription-specific reorder buffer (delivery time) if set, otherwise use default
    // This is separate from email notification thresholds
    const reorderBufferDays = prescription.reorderBufferDays ?? REORDER_BUFFER_DAYS;
    
    const reorderDate = addDays(runOutDate, -reorderBufferDays);

    return {
      currentSupply: Math.max(0, currentSupply),
      runOutDate,
      reorderDate,
      daysRemaining: Math.max(0, daysRemaining),
    };
  } catch (error) {
    console.error('Error calculating supply info:', error, prescription);
    return {
      currentSupply: 0,
      runOutDate: new Date(),
      reorderDate: new Date(),
      daysRemaining: 0,
    };
  }
}

