import { useState } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { SortingBins } from '@/components/SortingBins';
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100">
      {/* Main hero content */}
      <HeroSection onConnectGmail={handleConnectGmail} />
      
      {/* Sorting bins below hero content */}
      <SortingBins />
    </div>
  );
};

export default Index;
