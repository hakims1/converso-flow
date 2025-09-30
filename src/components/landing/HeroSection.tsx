import { Button } from '@/components/ui/button';
import { Mail, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface HeroSectionProps {
  onConnectGmail: () => void;
}

export function HeroSection({ onConnectGmail }: HeroSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="relative z-20 w-full px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="
              w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl text-slate-800 tracking-tight">Inbox Advisor</span>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-20">
            <button className="text-slate-600 hover:text-slate-800 transition-colors">Features</button>
            <button className="text-slate-600 hover:text-slate-800 transition-colors">Pricing</button>
          </div>

          {/* Right side buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              className="text-slate-600 hover:text-slate-800 transition-colors"
              onClick={handleLogin}
            >
              Log in
            </button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              onClick={onConnectGmail}
            >
              Try for free
            </Button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2">
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 pt-16 pb-8">
        <div className="text-center max-w-5xl">
          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent tracking-tight leading-tight max-w-5xl mx-auto drop-shadow-sm">
            Inbox Advisor
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-700 mb-12 max-w-6xl mx-auto leading-relaxed bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent font-semibold tracking-tight drop-shadow-sm">
            automatically identifies the email conversations that require your attention
          </p>

          {/* CTA Button */}
          <Button 
            size="lg" 
            className="bg-[rgba(0,0,0,1)] hover:bg-blue-700 text-white px-12 py-6 text-xl rounded-lg transition-all duration-200 hover:scale-105 shadow-lg mb-6 inline-flex items-center gap-3"
            onClick={onConnectGmail}
          >
            Connect Gmail and start free
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>

          {/* Trust indicators */}
          <div className="mt-6 text-sm text-slate-500">
            <p>✓ Try for free • ✓ No credit card required</p>
          </div>
        </div>
      </div>
    </div>
  );
}