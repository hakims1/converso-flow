import { useState } from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureCards } from '@/components/landing/FeatureCards';
import { SortingBins } from '@/components/landing/SortingBins';
import { Testimonials } from '@/components/landing/Testimonials';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleConnectGmail = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSection onConnectGmail={handleConnectGmail} />
      
      {/* Feature Cards */}
      <FeatureCards />
      
      {/* Sorting Bins Animation */}
      <SortingBins />
      
      {/* Testimonials */}
      <Testimonials />
    </div>
  );
};

export default Index;
