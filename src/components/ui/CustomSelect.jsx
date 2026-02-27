import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, placeholder, icon: Icon, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    padding: '12px',
                    paddingLeft: '40px',
                    paddingRight: '36px',
                    borderRadius: '8px',
                    border: isOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    userSelect: 'none',
                    boxShadow: isOpen ? '0 0 0 4px rgba(37, 99, 235, 0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    minHeight: '45px',
                    width: '100%'
                }}
            >
                {/* Left Icon */}
                {Icon && (
                    <div style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Icon size={18} />
                    </div>
                )}

                <span style={{ 
                    color: selectedOption ? '#1e293b' : '#94a3b8', 
                    fontSize: '1rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <ChevronDown 
                    size={16} 
                    style={{ 
                        color: '#64748b', 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                    }} 
                />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    zIndex: 9999,
                    padding: '4px',
                    width: '100%'
                }}>
                    {options.length > 0 ? (
                        options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                style={{
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderRadius: '6px',
                                    background: option.value === value ? '#eff6ff' : 'transparent',
                                    color: option.value === value ? '#2563eb' : '#334155',
                                    fontSize: '0.95rem',
                                    transition: 'background 0.1s',
                                    marginBottom: '2px'
                                }}
                                onMouseEnter={(e) => {
                                    if (option.value !== value) e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    if (option.value !== value) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <span>{option.label}</span>
                                {option.value === value && <Check size={16} />}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                            No options available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
