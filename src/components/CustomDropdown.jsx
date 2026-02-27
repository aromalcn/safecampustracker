import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomDropdown = ({ options, value, onChange, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const optionsRef = useRef([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset refs when options change to prevent stale references
  useEffect(() => {
    optionsRef.current = optionsRef.current.slice(0, options.length);
  }, [options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsRef.current[highlightedIndex]) {
      optionsRef.current[highlightedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option) => {
    if (disabled) return;
    onChange(option);
    setIsOpen(false);
    setIsFocused(false);
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    setIsFocused(!isOpen);
    if (!isOpen) {
      // Find index of current value to highlight it initially
      const currentIndex = options.findIndex(opt => 
        (typeof opt === 'object' ? opt.value === value : opt === value)
      );
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : -1);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(options.findIndex(opt => (typeof opt === 'object' ? opt.value === value : opt === value)) || 0);
        } else if (highlightedIndex >= 0) {
          const option = options[highlightedIndex];
          const val = typeof option === 'object' ? option.value : option;
          handleSelect(val);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) => 
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setIsFocused(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    const selected = options.find(opt => 
      (typeof opt === 'object' ? opt.value === value : opt === value)
    );
    return selected ? (typeof selected === 'object' ? selected.label : selected) : value;
  };

  return (
    <div 
      className="custom-dropdown-container" 
      ref={dropdownRef} 
      style={{ 
        position: 'relative', 
        width: '100%',
        opacity: disabled ? 0.7 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
    >
      <div
        className="custom-dropdown-trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '8px',
          border: `1px solid ${isFocused || isOpen ? '#3b82f6' : '#d1d5db'}`,
          fontSize: '1rem',
          backgroundColor: disabled ? '#f3f4f6' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: value ? '#1f2937' : '#9ca3af',
          transition: 'all 0.3s ease',
          boxShadow: (isFocused || isOpen) ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
          outline: 'none'
        }}
      >
        <span>{getDisplayValue()}</span>
        <ChevronDown 
          size={20} 
          color="#6b7280" 
          style={{ 
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </div>

      {isOpen && (
        <div 
          className="custom-dropdown-options"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: '0',
            right: '0',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 50,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {options.map((option, index) => {
            const label = typeof option === 'object' ? option.label : option;
            const val = typeof option === 'object' ? option.value : option;
            const isSelected = val === value;
            const isHighlighted = index === highlightedIndex;
            
            return (
              <div
                key={val}
                ref={(el) => (optionsRef.current[index] = el)}
                onClick={() => handleSelect(val)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={isSelected}
                className="dropdown-option"
                style={{
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: isSelected ? '#1e40af' : '#1f2937', // Darker blue for selected text
                  backgroundColor: isHighlighted ? '#e2e8f0' : (isSelected ? '#eff6ff' : 'white'), // Darker gray for highlight
                  transition: 'background-color 0.1s ease',
                  fontWeight: isSelected ? '600' : '400',
                  borderLeft: isHighlighted || isSelected ? '4px solid #2563eb' : '4px solid transparent', // Thicker border
                  position: 'relative',
                  zIndex: 1
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
