import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Activity, Users } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navbar */}
      <header className="landing-header">
        <div className="brand-container">
          <ShieldCheck size={32} color="#4fc3f7" />
          <span className="brand-text">SafeCampus Tracker</span>
        </div>
        <div className="auth-buttons">
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>
            Login
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-tagline">Next-Gen Campus Security</span>
          <h1 className="hero-title">
            Safety First,<br /> Always.
          </h1>
          <p className="hero-description">
            A comprehensive solution for real-time student tracking, smart attendance, 
            and emergency response systems. Empowering institutions with data-driven security.
          </p>
          
          <div className="stats-container">
            <div className="stat-item">
              <h3>100%</h3>
              <p>Secure</p>
            </div>
            <div className="stat-item">
              <h3>24/7</h3>
              <p>Monitoring</p>
            </div>
            <div className="stat-item">
              <h3>Real-time</h3>
              <p>Updates</p>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="circle-bg c1"></div>
          <div className="circle-bg c2"></div>
          {/* Placeholder for a hero image or 3D element */}
          <ShieldCheck size={300} color="rgba(79, 195, 247, 0.1)" strokeWidth={0.5} />
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
