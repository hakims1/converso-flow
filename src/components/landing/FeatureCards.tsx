import { Mail } from 'lucide-react';

export function FeatureCards() {
  return (
    <div className="pt-16 pb-32 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Feature Content - Reimagined Design */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          
          {/* Email Prioritization */}
          <div className="flex flex-col items-center space-y-8">
            {/* Large Floating Icon */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 via-orange-500 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-500/30 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Mail className="w-12 h-12 text-white drop-shadow-lg" />
              </div>
              {/* Floating accent */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full shadow-lg animate-pulse"></div>
            </div>
            
            {/* Content */}
            <div className="text-center space-y-4">
              <h3 className="text-3xl text-slate-900 drop-shadow-sm">Email Prioritization</h3>
              <p className="text-lg text-slate-700 max-w-xs leading-relaxed">Automatically identify which emails need immediate responses</p>
            </div>
            
            {/* Featured Screenshot - Now the Hero */}
            <div className="w-full max-w-sm">
              <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden border border-slate-200/50 transform hover:scale-105 transition-transform duration-300">
                <div className="p-6 space-y-4">
                  <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      MJ
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">Urgent</span>
                      </div>
                      <div className="text-sm text-slate-800 font-medium">Critical server outage - immediate action needed</div>
                      <div className="text-xs text-slate-500 mt-1">Michael Johnson • 2 hours ago</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      SW
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full">Follow up</span>
                      </div>
                      <div className="text-sm text-slate-800 font-medium">Partnership proposal - next steps discussion</div>
                      <div className="text-xs text-slate-500 mt-1">Sarah Williams • 1 day ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Categories */}
          <div className="flex flex-col items-center space-y-8">
            {/* Large Floating Icon */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <svg className="w-12 h-12 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3h3l2 2h6a2 2 0 012 2v1" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 1h4l1.5 1.5H21a1 1 0 011 1v1" />
                </svg>
              </div>
              {/* Floating accent */}
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-emerald-400 rounded-full shadow-lg animate-pulse"></div>
            </div>
            
            {/* Content */}
            <div className="text-center space-y-4">
              <h3 className="text-3xl text-slate-900 drop-shadow-sm">Smart Categories</h3>
              <p className="text-lg text-slate-700 max-w-xs leading-relaxed">Organizes your emails into actionable groups for better workflow</p>
            </div>
            
            {/* Featured Screenshot */}
            <div className="w-full max-w-sm">
              <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden border border-slate-200/50 transform hover:scale-105 transition-transform duration-300">
                <div className="p-6 space-y-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white mb-6">
                    <h4 className="text-sm mb-4 flex items-center gap-2">
                      <span>📋</span> Product Updates
                    </h4>
                    <div className="text-xs text-indigo-100">3 emails</div>
                  </div>
                  <div className="space-y-5">
                    <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-700 mb-1">New feature release notes</div>
                        <div className="text-xs text-slate-500">Product Team</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-700 mb-1">API changes documentation</div>
                        <div className="text-xs text-slate-500">Engineering Team</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instant Insights */}
          <div className="flex flex-col items-center space-y-8">
            {/* Large Floating Icon */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <svg className="w-12 h-12 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              {/* Floating accent */}
              <div className="absolute -bottom-2 -right-1 w-6 h-6 bg-orange-400 rounded-full shadow-lg animate-pulse"></div>
            </div>
            
            {/* Content */}
            <div className="text-center space-y-4">
              <h3 className="text-3xl text-slate-900 drop-shadow-sm">Instant Insights</h3>
              <p className="text-lg text-slate-700 max-w-xs leading-relaxed">Get immediate analysis of your email patterns and trends</p>
            </div>
            
            {/* Featured Screenshot */}
            <div className="w-full max-w-sm">
              <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden border border-slate-200/50 transform hover:scale-105 transition-transform duration-300">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-lg">📊</span>
                    <h4 className="text-sm text-slate-700">This Week's Summary</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600">Emails received:</span>
                      <span className="text-lg text-slate-900">127</span>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-600">Product (45%)</span>
                        <div className="flex-1 ml-3">
                          <div className="w-full bg-blue-100 rounded-full h-2">
                            <div className="w-[45%] bg-blue-500 rounded-full h-2"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-600">Support (30%)</span>
                        <div className="flex-1 ml-3">
                          <div className="w-full bg-emerald-100 rounded-full h-2">
                            <div className="w-[30%] bg-emerald-500 rounded-full h-2"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-orange-600">Marketing (25%)</span>
                        <div className="flex-1 ml-3">
                          <div className="w-full bg-orange-100 rounded-full h-2">
                            <div className="w-[25%] bg-orange-500 rounded-full h-2"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}