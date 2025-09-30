import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, Shield, Lock, Eye, Settings } from 'lucide-react';

interface GmailPermissionsProps {
  onBack: () => void;
  onContinue: () => void;
}

export function GmailPermissions({ onBack, onContinue }: GmailPermissionsProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100">
      {/* Header with Back Button */}
      <div className="pt-8 px-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="w-full max-w-2xl">
          {/* Permission Card */}
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100">
            {/* Product Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                {/* Custom Logo: Email sorting/organizing icon */}
                <svg className="w-12 h-12 text-white" viewBox="0 0 48 48" fill="none">
                  {/* Email envelope base */}
                  <path d="M8 12 L40 12 A4 4 0 0 1 44 16 L44 32 A4 4 0 0 1 40 36 L8 36 A4 4 0 0 1 4 32 L4 16 A4 4 0 0 1 8 12 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  {/* Email fold line */}
                  <path d="M44 16 L24 26 L4 16" stroke="currentColor" strokeWidth="2" fill="none"/>
                  {/* Sorting arrows - showing organization */}
                  <path d="M16 6 L20 2 L24 6" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M24 42 L28 46 L32 42" stroke="currentColor" strokeWidth="2" fill="none"/>
                  {/* Priority dots - showing categorization */}
                  <circle cx="38" cy="18" r="2" fill="currentColor"/>
                  <circle cx="38" cy="24" r="2" fill="currentColor"/>
                  <circle cx="38" cy="30" r="2" fill="currentColor"/>
                </svg>
              </div>
            </div>

            {/* Main Heading */}
            <div className="text-center mb-12">
              <h1 className="text-3xl text-gray-900 mb-4">
                Connect Your Email
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg mx-auto">
                Inbox Advisor needs access to your Gmail to work its magic
              </p>
            </div>

            {/* Sign in Button */}
            <div className="flex justify-center mb-12">
              <Button 
                onClick={onContinue}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-12 py-4 text-lg rounded-lg transition-all duration-200 hover:shadow-md shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </div>
              </Button>
            </div>

            {/* Privacy Section */}
            <div className="mb-10">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-green-600" />
                <h2 className="text-xl text-gray-900">Your Privacy is Protected</h2>
              </div>
              
              <div className="bg-gray-50/50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  We take your privacy seriously and have designed our system to be completely secure. Our service only accesses email headers and metadata—never your actual email content. This means we can analyze your email patterns and organize your conversations without ever reading what you've written or received.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  All data processing happens securely with encryption, and you maintain complete control over your information. You can revoke our access at any time directly from your Google account settings, giving you full transparency and control over your data.
                </p>
              </div>

              {/* Privacy Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <Eye className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Only metadata access, never email content</span>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">End-to-end encrypted processing</span>
                </div>
                <div className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Revoke access anytime from Google</span>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-600">Google API compliance certified</span>
                </div>
              </div>
            </div>

            {/* Legal Text */}
            <div className="text-center pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 leading-relaxed mb-3">
                By continuing, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                  Privacy Policy
                </a>
                . We adhere to all Google API Services User Data Policy requirements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}