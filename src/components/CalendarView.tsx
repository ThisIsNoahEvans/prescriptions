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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 lg:p-4">
      <div className="flex justify-between items-center mb-3 lg:mb-4">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Calendar View</h2>
        <div className="flex gap-1 lg:gap-2">
          <button
            onClick={goToPreviousMonth}
            className="px-2 lg:px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm lg:text-base"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            onClick={goToToday}
            className="px-3 lg:px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs lg:text-sm"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="px-2 lg:px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm lg:text-base"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <h3 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white mb-2 lg:mb-3 text-center">
        {monthYear}
      </h3>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-0.5 lg:gap-1 mb-1 lg:mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 py-1 lg:py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 lg:gap-1">
        {days.map((day, index) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonthDay = isCurrentMonth(day);
          const dayEvents = getEventsForDate(day);

          return (
            <div
              key={index}
              className={`min-h-[50px] lg:min-h-[60px] xl:min-h-[70px] p-0.5 lg:p-1 border border-gray-200 dark:border-gray-700 rounded ${
                isCurrentMonthDay
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-gray-50 dark:bg-gray-900 opacity-50'
              } ${isToday ? 'ring-1 lg:ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
            >
              <div
                className={`text-xs lg:text-sm font-medium mb-0.5 lg:mb-1 ${
                  isToday
                    ? 'text-blue-600 dark:text-blue-400'
                    : isCurrentMonthDay
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {day.getDate()}
              </div>
              <div className="space-y-0.5 lg:space-y-1">
                {dayEvents.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className={`${getEventTypeColor(
                      event.type
                    )} text-white text-[10px] lg:text-xs px-0.5 lg:px-1 py-0 lg:py-0.5 rounded truncate`}
                    title={event.label}
                  >
                    {event.prescription.name.substring(0, 8)}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 lg:mt-4 pt-2 lg:pt-3 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs lg:text-sm font-semibold text-gray-900 dark:text-white mb-2 lg:mb-3">Legend</h4>
        <div className="flex flex-wrap gap-2 lg:gap-4">
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-green-500 dark:bg-green-600 rounded"></div>
            <span className="text-xs lg:text-sm text-gray-700 dark:text-gray-300">Delivery</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-yellow-500 dark:bg-yellow-600 rounded"></div>
            <span className="text-xs lg:text-sm text-gray-700 dark:text-gray-300">Reorder Date</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-red-500 dark:bg-red-600 rounded"></div>
            <span className="text-xs lg:text-sm text-gray-700 dark:text-gray-300">Run Out Date</span>
          </div>
        </div>
      </div>
    </div>
  );
}

