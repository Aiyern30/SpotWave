// components/BouncingDotsLoader.tsx
import React from 'react';
import { motion } from 'framer-motion';

const BouncingDotsLoader = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="flex space-x-2">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-6 h-6 bg-blue-500 rounded-full"
            animate={{ y: [0, -12, 0] }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
              ease: "easeInOut",
              delay: index * 0.2
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BouncingDotsLoader;
