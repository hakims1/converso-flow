import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Users, Tags, BarChart3 } from 'lucide-react';

interface AnalysisPageProps {
  onAnalyze: () => void;
  onBack: () => void;
  loading?: boolean;
}

export function AnalysisPage({ onAnalyze, onBack, loading = false }: AnalysisPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar with Logo and Tabs */}
      <nav className="bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo on the left */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl text-gray-900 tracking-tight font-semibold">Inbox Advisor</span>
          </div>

          {/* Centered Navigation Tabs */}
          <div className="flex items-center justify-center flex-1">
            <div className="flex space-x-16">
              <div className="flex items-center px-6 py-3 bg-blue-600 rounded-full">
                <MessageSquare className="w-5 h-5 text-white mr-3" />
                <span className="text-white font-semibold">Conversations</span>
              </div>
              <div className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
                <Tags className="w-5 h-5 mr-3" />
                <span className="font-medium">Categories</span>
              </div>
              <div className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
                <Users className="w-5 h-5 mr-3" />
                <span className="font-medium">Contacts</span>
              </div>
            </div>
          </div>

          {/* Empty div to balance the flex layout */}
          <div className="w-32"></div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16 pt-12">
          {/* Main Title */}
          <h1 className="text-3xl md:text-4xl text-gray-900 mb-4">
            Analyze your last two weeks of emails for free
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Instantly identify recent conversations that you need to respond to or follow up on.
          </p>

          {/* CTA Button */}
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-16 py-6 text-xl rounded-xl transition-all duration-200 hover:scale-105 shadow-lg inline-flex items-center gap-4"
            onClick={onAnalyze}
            disabled={loading}
          >
            <BarChart3 className="w-6 h-6" />
            {loading ? 'Analyzing...' : 'Analyze Emails'}
          </Button>
        </div>

        {/* Pricing Section */}
        <div className="mt-24">
          {/* Pricing Header */}
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl text-gray-900 mb-4">
              Analyze Your Complete Email History
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Our analysis uses advanced AI to process each email, which incurs computational costs. 
              Our pricing reflects these analysis costs while keeping plans affordable for every business size.
            </p>
          </div>

          {/* Pricing Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col">
              <div className="text-center flex-1 flex flex-col">
                <h3 className="text-xl text-gray-900 mb-2">Free</h3>
                <div className="text-3xl text-gray-900 mb-6">
                  $0<span className="text-sm text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8 text-left flex-1">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span className="text-gray-700">Analyze your last 2 weeks of emails</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 mt-auto"
                  onClick={onAnalyze}
                  disabled={loading}
                >
                  Get Started Free
                </Button>
              </div>
            </div>

            {/* Startup Tier */}
            <div className="bg-white rounded-2xl p-8 border-2 border-blue-500 shadow-lg relative flex flex-col">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm">Most Popular</span>
              </div>
              <div className="text-center flex-1 flex flex-col">
                <h3 className="text-xl text-gray-900 mb-2">Startup</h3>
                <div className="text-3xl text-gray-900 mb-6">
                  $9.99<span className="text-sm text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8 text-left flex-1">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span className="text-gray-700">Analyze your last 3 months of emails</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span className="text-gray-700">Analyze your most recent emails</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-auto"
                >
                  Start 7-Day Trial
                </Button>
              </div>
            </div>

            {/* Professional Tier */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col">
              <div className="text-center flex-1 flex flex-col">
                <h3 className="text-xl text-gray-900 mb-2">Professional</h3>
                <div className="text-3xl text-gray-900 mb-6">
                  $29.99<span className="text-sm text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8 text-left flex-1">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span className="text-gray-700">Analyze your entire history of emails</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span className="text-gray-700">Analyze your most recent emails</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span className="text-gray-700">Gmail app integration</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span className="text-gray-700">Chrome extension</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white mt-auto"
                >
                  Start 7-Day Trial
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}