import React from 'react';
import HeroSection from './sections/HeroSection';
import FeaturesSection from './sections/FeaturesSection';
import DemoSection from './sections/DemoSection';
import PricingSection from './sections/PricingSection';
import ContactSection from './sections/ContactSection';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <PricingSection />
      <ContactSection />
    </div>
  );
};

export default LandingPage;
