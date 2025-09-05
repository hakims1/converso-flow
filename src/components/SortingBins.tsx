import { Mail, FileText, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface FlyingEmail {
  id: number;
  startX: number;
  startY: number;
  targetBin: 'left' | 'right';
  type: 'respond' | 'followup';
}

export function SortingBins() {
  const [flyingEmails, setFlyingEmails] = useState<FlyingEmail[]>([]);

  useEffect(() => {
    const createFlyingEmail = () => {
      // Calculate target positions based on the sorting bins layout
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const newEmail: FlyingEmail = {
        id: Date.now() + Math.random(),
        startX: Math.random() * viewportWidth,
        startY: Math.random() * (viewportHeight * 0.3) + viewportHeight * 0.1,
        targetBin: Math.random() > 0.5 ? 'left' : 'right',
        type: Math.random() > 0.5 ? 'respond' : 'followup'
      };
      
      setFlyingEmails(prev => [...prev, newEmail]);
      
      // Remove email after animation completes
      setTimeout(() => {
        setFlyingEmails(prev => prev.filter(email => email.id !== newEmail.id));
      }, 3000);
    };

    // Create flying emails periodically
    const interval = setInterval(createFlyingEmail, 2000);
    
    // Create initial emails
    setTimeout(createFlyingEmail, 500);
    setTimeout(createFlyingEmail, 1500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full pt-8 pb-20 px-8 overflow-hidden relative">
      {/* Sorting Bins Container */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 justify-items-center">
          
          {/* Left Sorting Bin - "Respond" */}
          <div className="w-full max-w-sm opacity-90">
            {/* Label positioned independently */}
            <div className="flex justify-center mb-4">
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full shadow-sm text-sm tracking-wide">
                Need to Respond
              </span>
            </div>
            
            <motion.div 
              className="relative mt-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Bin Container */}
              <div className="w-full h-52 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl relative overflow-visible shadow-sm flex items-center justify-center">
                
                {/* Email Stack Inside Container */}
<div className="relative -mt-8">
  {/* Email cards stacked and slightly rotated */}
  {[...Array(8)].map((_, i) => (
    <motion.div
      key={i}
      className="absolute w-40 sm:w-48 h-12 bg-white border border-orange-200/50 rounded-lg shadow-sm"
      initial={{ y: 20, opacity: 0, x: "-50%" }}
      animate={{ 
        y: i * 4 - (8 * 4 / 2),
        x: "-50%", 
        opacity: 1,
        rotate: (Math.random() - 0.5) * 10
      }}
      transition={{ 
        duration: 0.5, 
        delay: i * 0.1 + 0.5,
        type: "spring",
        stiffness: 100
      }}
      style={{ 
        zIndex: 10 - i,
        left: "50%" 
      }}
    >
      <div className="flex items-center gap-2 p-2">
        <Mail className="w-4 h-4 text-orange-500" />
        <div className="flex-1 h-2 bg-orange-100 rounded"></div>
        <AlertCircle className="w-3 h-3 text-red-400" />
      </div>
    </motion.div>
  ))}
</div>

          {/* Right Sorting Bin - "Follow-up" */}
          <div className="w-full max-w-sm opacity-90">
            {/* Label positioned independently */}
            <div className="flex justify-center mb-4">
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2 rounded-full shadow-sm text-sm tracking-wide">
                Need to Follow-up
              </span>
            </div>
            
            <motion.div 
              className="relative mt-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {/* Bin Container */}
              <div className="w-full h-52 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl relative overflow-visible shadow-sm flex items-center justify-center">
                
                {/* Email Stack Inside Container */}
                <div className="relative -mt-8 w-48 left-1/2 transform -translate-x-1/2">
                  {/* Email cards stacked and slightly rotated */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-40 sm:w-48 h-12 bg-white border border-blue-200/50 rounded-lg shadow-sm left-0"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ 
                        y: i * 4 - (6 * 4 / 2) - 6, // Adjusted for centering
                        opacity: 1,
                        rotate: (Math.random() - 0.5) * 8
                      }}
                      transition={{ 
                        duration: 0.5, 
                        delay: i * 0.1 + 0.7,
                        type: "spring",
                        stiffness: 100
                      }}
                      style={{ zIndex: 10 - i }}
                    >
                      <div className="flex items-center gap-2 p-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <div className="flex-1 h-2 bg-blue-100 rounded"></div>
                        <Clock className="w-3 h-3 text-blue-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
          
        </div>
      </div>

      {/* Flying Email Animations - Fixed positioning to target actual bin locations */}
      <div className="fixed inset-0 pointer-events-none z-30">
        {flyingEmails.map((email) => {
          // Calculate target positions for the sorting bins based on viewport
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Calculate the center positions of the sorting bins more accurately
          const leftBinX = viewportWidth < 1024 ? viewportWidth / 2 - 100 : viewportWidth * 0.3;
          const rightBinX = viewportWidth < 1024 ? viewportWidth / 2 + 100 : viewportWidth * 0.7;
          const binY = viewportHeight * 0.78; // Better estimation of bin vertical center
          
          return (
            <motion.div
              key={email.id}
              className="absolute w-32 h-8 bg-white border-2 rounded shadow-lg z-20"
              initial={{
                x: email.startX,
                y: email.startY,
                rotate: Math.random() * 20 - 10,
                scale: 0.8,
                opacity: 0
              }}
              animate={{
                x: email.targetBin === 'left' ? leftBinX : rightBinX,
                y: binY,
                rotate: email.targetBin === 'left' ? -15 : 15,
                scale: 1,
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 3,
                ease: "easeInOut",
                times: [0, 0.1, 0.9, 1]
              }}
              style={{
                borderColor: email.type === 'respond' ? '#fb7185' : '#60a5fa'
              }}
            >
              <div className="flex items-center gap-2 p-1">
                <Mail 
                  className={`w-3 h-3 ${
                    email.type === 'respond' ? 'text-orange-500' : 'text-blue-500'
                  }`} 
                />
                <div 
                  className={`flex-1 h-1 rounded ${
                    email.type === 'respond' ? 'bg-orange-200' : 'bg-blue-200'
                  }`}
                ></div>
                {email.type === 'respond' ? (
                  <AlertCircle className="w-2 h-2 text-red-400" />
                ) : (
                  <Clock className="w-2 h-2 text-blue-400" />
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Additional scattered emails for visual effect */}
        <motion.div 
          className="absolute top-1/4 left-1/4 opacity-20"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 0.2 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          <div className="w-32 h-8 bg-white border border-gray-300 rounded shadow-sm transform rotate-12">
            <div className="flex items-center gap-2 p-1">
              <Mail className="w-3 h-3 text-gray-500" />
              <div className="flex-1 h-1 bg-gray-300 rounded"></div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="absolute bottom-1/4 right-1/4 opacity-20"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 0.2 }}
          transition={{ duration: 1, delay: 2 }}
        >
          <div className="w-32 h-8 bg-white border border-gray-300 rounded shadow-sm transform -rotate-6">
            <div className="flex items-center gap-2 p-1">
              <Mail className="w-3 h-3 text-gray-500" />
              <div className="flex-1 h-1 bg-gray-300 rounded"></div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="absolute top-1/3 right-1/3 opacity-20"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.2 }}
          transition={{ duration: 0.8, delay: 2.5 }}
        >
          <div className="w-32 h-8 bg-white border border-gray-300 rounded shadow-sm transform rotate-3">
            <div className="flex items-center gap-2 p-1">
              <Mail className="w-3 h-3 text-gray-500" />
              <div className="flex-1 h-1 bg-gray-300 rounded"></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}