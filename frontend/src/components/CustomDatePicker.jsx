import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function CustomDatePicker({ value, onChange, minDate = '', placeholder = 'Select Date' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);

  // Sync calendar view month with selected value when it changes
  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentMonth(parsed);
      }
    }
  }, [value]);

  // Click outside to close handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDaySelect = (dateStr) => {
    if (onChange) {
      onChange(dateStr);
    }
    setIsOpen(false);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const days = [];
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Padding days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: prevTotalDays - i,
      isPadding: true,
      dateStr: null
    });
  }

  // Days in current month
  for (let i = 1; i <= totalDays; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isPast = minDate && dateStr < minDate;
    days.push({
      day: i,
      isPadding: false,
      dateStr,
      disabled: isPast
    });
  }

  // Padding days for next month
  const remainingSlots = 42 - days.length;
  for (let i = 1; i <= remainingSlots; i++) {
    days.push({
      day: i,
      isPadding: true,
      dateStr: null
    });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  return (
    <div className="custom-datepicker-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="form-control datepicker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-light)' }}>
          {value ? formatDateToDMY(value) : placeholder}
        </span>
        <CalendarIcon size={16} style={{ color: 'var(--accent)' }} />
      </button>

      {isOpen && (
        <div className="custom-datepicker-popover" style={{
          position: 'absolute',
          top: '105%',
          left: 0,
          zIndex: 9999,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          boxShadow: 'var(--shadow-lg)',
          width: '280px'
        }}>
          <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <button type="button" className="calendar-nav-btn" onClick={prevMonth} style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={12} />
            </button>
            <span className="calendar-month-title" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {monthNames[month]} {year}
            </span>
            <button type="button" className="calendar-nav-btn" onClick={nextMonth} style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={12} />
            </button>
          </div>
          <div className="calendar-weekdays" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.4rem' }}>
            {weekdays.map(w => <span key={w}>{w}</span>)}
          </div>
          <div className="calendar-days-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
            {days.map((item, idx) => {
              if (item.isPadding) {
                return (
                  <button
                    key={idx}
                    type="button"
                    className="calendar-day-cell padding-day"
                    disabled
                    style={{ background: 'transparent', border: 'none', color: '#eaeaea', fontSize: '0.8rem', aspectRatio: 1, padding: 0 }}
                  >
                    {item.day}
                  </button>
                );
              }
              const isSelected = value === item.dateStr;
              const isToday = item.dateStr === new Date().toISOString().split('T')[0];
              return (
                <button
                  key={idx}
                  type="button"
                  className={`calendar-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  disabled={item.disabled}
                  onClick={() => handleDaySelect(item.dateStr)}
                  style={{
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? 'white' : item.disabled ? 'var(--border-color)' : 'var(--text-primary)',
                    textDecoration: item.disabled ? 'line-through' : 'none',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    border: isToday && !isSelected ? '1px solid var(--accent)' : 'none',
                    borderRadius: '50%',
                    fontSize: '0.8rem',
                    aspectRatio: 1,
                    padding: 0,
                    fontWeight: isSelected || isToday ? '600' : '500'
                  }}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
