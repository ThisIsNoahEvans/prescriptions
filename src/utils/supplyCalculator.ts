import { Prescription, SupplyInfo } from '../types';
import { normalizeDate, dateDiffInDays, addDays } from './dateUtils';

const DEFAULT_REORDER_BUFFER_DAYS = 10;

/**
 * Calculates supply information for a prescription.
 * This accounts for:
 * - Initial supply
 * - All logged deliveries
 * - Daily consumption based on elapsed time
 * - Overlapping supplies (when new deliveries arrive before old ones run out)
 * - Custom reorder buffer days (delivery time) for reorder date calculation
 */
export function calculateSupplyInfo(prescription: Prescription): SupplyInfo {
  try {
    const today = normalizeDate(new Date());
    const startDate = normalizeDate(prescription.startDate.toDate());
    const dailyDose = prescription.dailyDose;

    console.log(`[SupplyCalc] Starting calculation for: ${prescription.name}`, {
      id: prescription.id,
      startDate: startDate.toISOString(),
      startSupply: prescription.startSupply,
      dailyDose,
      supplyLogCount: prescription.supplyLog.length,
      reorderBufferDays: prescription.reorderBufferDays,
      emailThresholds: prescription.emailThresholds,
    });

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

    console.log(`[SupplyCalc] ${prescription.name} - Supply calculation:`, {
      totalAdded,
      daysPassed,
      daysIncludingToday,
      totalConsumed,
      currentSupply,
    });

    // 4. Calculate future dates
    const daysRemaining = dailyDose > 0 ? Math.floor(currentSupply / dailyDose) : 9999;
    const runOutDate = addDays(today, daysRemaining);
    
    // Use prescription-specific reorder buffer (delivery time) if set, otherwise use default
    // This is separate from email notification thresholds
    const reorderBufferDays = prescription.reorderBufferDays ?? DEFAULT_REORDER_BUFFER_DAYS;
    
    // Ensure reorderBufferDays is a valid positive number
    const validReorderBufferDays = (typeof reorderBufferDays === 'number' && reorderBufferDays > 0) 
      ? reorderBufferDays 
      : DEFAULT_REORDER_BUFFER_DAYS;
    
    console.log(`[SupplyCalc] ${prescription.name} - Reorder buffer calculation:`, {
      prescriptionReorderBufferDays: prescription.reorderBufferDays,
      reorderBufferDays,
      validReorderBufferDays,
      default: DEFAULT_REORDER_BUFFER_DAYS,
    });
    
    const reorderDate = addDays(runOutDate, -validReorderBufferDays);
    
    console.log(`[SupplyCalc] ${prescription.name} - Date calculations:`, {
      today: today.toISOString(),
      daysRemaining,
      runOutDate: runOutDate.toISOString(),
      reorderDate: reorderDate.toISOString(),
      reorderDateValid: !isNaN(reorderDate.getTime()),
      reorderDateType: typeof reorderDate,
      reorderDateInstance: reorderDate instanceof Date,
    });
    
    // Ensure reorder date is a valid Date object
    if (isNaN(reorderDate.getTime())) {
      console.error(`[SupplyCalc] ${prescription.name} - Invalid reorder date calculated:`, { 
        runOutDate: runOutDate.toISOString(), 
        reorderDate: reorderDate.toString(), 
        daysRemaining, 
        reorderBufferDays: validReorderBufferDays,
        prescription: prescription.name,
        reorderDateType: typeof reorderDate,
        reorderDateInstance: reorderDate instanceof Date,
      });
      // Fallback to a safe date if calculation fails
      const fallbackDate = addDays(today, -1);
      console.warn(`[SupplyCalc] ${prescription.name} - Using fallback reorder date:`, fallbackDate.toISOString());
      return {
        currentSupply: Math.max(0, currentSupply),
        runOutDate,
        reorderDate: fallbackDate,
        daysRemaining: Math.max(0, daysRemaining),
      };
    }

    const result = {
      currentSupply: Math.max(0, currentSupply), // Don't show negative supply
      runOutDate,
      reorderDate,
      daysRemaining: Math.max(0, daysRemaining),
    };
    
    console.log(`[SupplyCalc] ${prescription.name} - Final result:`, {
      currentSupply: result.currentSupply,
      runOutDate: result.runOutDate.toISOString(),
      reorderDate: result.reorderDate.toISOString(),
      daysRemaining: result.daysRemaining,
      reorderDateValid: !isNaN(result.reorderDate.getTime()),
      reorderDateType: typeof result.reorderDate,
    });
    
    return result;
  } catch (error) {
    console.error(`[SupplyCalc] ${prescription.name} - Error calculating supply info:`, error, prescription);
    // Return safe defaults on error
    return {
      currentSupply: 0,
      runOutDate: new Date(),
      reorderDate: new Date(),
      daysRemaining: 0,
    };
  }
}

