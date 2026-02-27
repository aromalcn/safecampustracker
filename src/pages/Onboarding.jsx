import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Bell, LayoutDashboard, ArrowRight, Check } from 'lucide-react';

const Onboarding = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            id: 1,
            title: "Smart Attendance with GPS",
            description: "Mark your attendance effortlessly using geolocation. Accurate, fast, and secure tracking for students and staff.",
            icon: <MapPin size={80} color="#fff" />,
            bgColor: '#4f46e5' // Indigo
        },
        {
            id: 2,
            title: "Real-time Safety Alerts",
            description: "Stay safe with instant notifications. Report emergencies and get help immediately with our integrated safety system.",
            icon: <Bell size={80} color="#fff" />,
            bgColor: '#ef4444' // Red
        },
        {
            id: 3,
            title: "Communication & Dashboard",
            description: "Everything in one place. View stats, connect with teachers, and manage academic progress seamlessly.",
            icon: <LayoutDashboard size={80} color="#fff" />,
            bgColor: '#10b981' // Emerald
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            navigate('/landing');
        }
    };

    const handleSkip = () => {
        navigate('/landing');
    };

    return (
        <div style={{ 
            height: '100vh', 
            width: '100vw', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '2rem',
            fontFamily: 'var(--font-family, sans-serif)',
            background: 'white',
            overflow: 'hidden'
        }}>
            {/* Skip Button */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                    onClick={handleSkip}
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        fontSize: '1rem', 
                        color: '#6b7280', 
                        fontWeight: 600, 
                        cursor: 'pointer' 
                    }}
                >
                    Skip
                </button>
            </div>

            {/* Content Area */}
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%' 
            }}>
                {/* Visual Circle */}
                <div style={{ 
                    position: 'relative',
                    marginBottom: '3rem'
                }}>
                    <div style={{ 
                        width: '200px', 
                        height: '200px', 
                        borderRadius: '50%', 
                        background: steps[currentStep].bgColor,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: `0 20px 40px ${steps[currentStep].bgColor}40`,
                        transition: 'all 0.5s ease'
                    }}>
                        {steps[currentStep].icon}
                    </div>
                </div>

                <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    color: '#1f2937', 
                    marginBottom: '1rem',
                    transition: 'all 0.3s ease'
                }}>
                    {steps[currentStep].title}
                </h2>
                <p style={{ 
                    fontSize: '1.1rem', 
                    color: '#6b7280', 
                    lineHeight: 1.6,
                    minHeight: '80px' // Prevent layout shift
                }}>
                    {steps[currentStep].description}
                </p>
            </div>

            {/* Bottom Controls */}
            <div style={{ width: '100%', maxWidth: '400px', marginBottom: '2rem' }}>
                {/* Dots Indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '2rem' }}>
                    {steps.map((_, index) => (
                        <div 
                            key={index}
                            style={{ 
                                width: index === currentStep ? '24px' : '8px', 
                                height: '8px', 
                                borderRadius: '4px', 
                                background: index === currentStep ? steps[currentStep].bgColor : '#e5e7eb',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                {/* Primary Button */}
                <button 
                    onClick={handleNext}
                    style={{ 
                        width: '100%', 
                        padding: '16px', 
                        borderRadius: '16px', 
                        background: '#000428', 
                        color: 'white', 
                        border: 'none', 
                        fontSize: '1.1rem', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                    }}
                >
                    {currentStep === steps.length - 1 ? (
                        <>Get Started <Check size={20} /></>
                    ) : (
                        <>Next <ArrowRight size={20} /></>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Onboarding;
