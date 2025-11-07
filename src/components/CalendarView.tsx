import { useState } from 'react';
import { Prescription } from '../types';
import { calculateSupplyInfo } from '../utils/supplyCalculator';
import {
  getDaysInMonth,
  formatMonthYear,
  isSameDay,
  normalizeDate,
} from '../utils/calendarUtils';
import { normalizeDate as normalizeDateUtil } from '../utils/dateUtils';

interface CalendarViewProps {
  prescriptions: Prescription[];
}

interface CalendarEvent {
  type: 'delivery' | 'reorder' | 'runout';
  prescription: Prescription;
  date: Date;
  label?: string;
}

export function CalendarView({ prescriptions }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = normalizeDateUtil(new Date());

  // Collect all events from all prescriptions
  const events: CalendarEvent[] = [];

  prescriptions.forEach((prescription) => {
    const supplyInfo = calculateSupplyInfo(prescription);

    // Add reorder date
    events.push({
      type: 'reorder',
      prescription,
      date: supplyInfo.reorderDate,
      label: `Reorder ${prescription.name}`,
    });

    // Add run out date
    events.push({
      type: 'runout',
      prescription,
      date: supplyInfo.runOutDate,
      label: `${prescription.name} runs out`,
    });

    // Add delivery dates
    prescription.supplyLog.forEach((log) => {
      events.push({
        type: 'delivery',
        prescription,
        date: log.date.toDate(),
        label: `${prescription.name} delivery (${log.quantity})`,
      });
    });
  });

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    const dateKey = normalizeDate(event.date).toISOString().split('T')[0];
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  });

  const days = getDaysInMonth(currentMonth);
  const monthYear = formatMonthYear(currentMonth);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const isCurrentMonth = (date: Date): boolean => {
    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    );
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = normalizeDate(date).toISOString().split('T')[0];
    return eventsByDate.get(dateKey) || [];
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'delivery':
        return 'bg-green-500 dark:bg-green-600';
      case 'reorder':
        return 'bg-yellow-500 dark:bg-yellow-600';
      case 'runout':
        return 'bg-red-500 dark:bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Calendar View</h2>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
        {monthYear}
      </h3>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonthDay = isCurrentMonth(day);
          const dayEvents = getEventsForDate(day);

          return (
            <div
              key={index}
              className={`min-h-[80px] p-1 border border-gray-200 dark:border-gray-700 rounded ${
                isCurrentMonthDay
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-gray-50 dark:bg-gray-900 opacity-50'
              } ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  isToday
                    ? 'text-blue-600 dark:text-blue-400'
                    : isCurrentMonthDay
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className={`${getEventTypeColor(
                      event.type
                    )} text-white text-xs px-1 py-0.5 rounded truncate`}
                    title={event.label}
                  >
                    {event.prescription.name.substring(0, 8)}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 dark:bg-green-600 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 dark:bg-yellow-600 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Reorder Date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 dark:bg-red-600 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Run Out Date</span>
          </div>
        </div>
      </div>
    </div>
  );
}

