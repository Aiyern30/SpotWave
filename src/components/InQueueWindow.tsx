"use client";

import React, { useState } from "react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi"; // Import icons

const InQueueWindow = () => {
  const [isOpen, setIsOpen] = useState(false); // State to track if the window is open

  return (
    <div
      className={`fixed bottom-4 right-4 ${
        isOpen ? "w-[500px] h-[500px]" : "w-[50px] h-[50px]"
      } bg-white shadow-lg rounded-md flex items-center justify-center`}
      style={{
        transition: "width 0.3s ease, height 0.3s ease", // Smooth transition for open/close
      }}
    >
      {isOpen ? (
        <div className="w-full h-full p-4 flex flex-col">
          <div className="flex justify-end">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiChevronDown size={24} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {/* Content goes here */}
            <p>Your content here...</p>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="text-gray-500">
          {/* Open icon */}
          <FiChevronUp size={24} />
        </button>
      )}
    </div>
  );
};

export default InQueueWindow;
