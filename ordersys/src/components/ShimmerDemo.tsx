"use client";

import { Shimmer } from "./Shimmer";
import { useState } from "react";

export function ShimmerDemo() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Shimmer Animation Demo</h2>
        <p className="text-gray-600">
          This demo showcases the fixed pill shimmer effect that prevents clipping while maintaining smooth animations.
        </p>
        
        <button
          onClick={() => setIsLoading(!isLoading)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {isLoading ? "Stop" : "Start"} Loading
        </button>
      </div>

      {/* Pill-shaped elements with shimmer */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Pill-shaped Elements</h3>
        
        {/* Small pill */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Small pill:</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            className="inline-flex items-center px-3 py-1.5 h-8 bg-gray-200 rounded-full text-sm text-gray-600"
          >
            Loading...
          </Shimmer>
        </div>

        {/* Medium pill (40px height as mentioned in requirements) */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Medium pill:</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            className="inline-flex items-center px-4 py-2 h-10 bg-gray-200 rounded-full text-sm text-gray-600"
          >
            Loading content...
          </Shimmer>
        </div>

        {/* Large pill */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Large pill:</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            className="inline-flex items-center px-6 py-3 h-12 bg-gray-200 rounded-full text-base text-gray-600"
          >
            Loading larger content...
          </Shimmer>
        </div>

        {/* Extra large pill with 50px border-radius */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">XL pill (50px):</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            className="inline-flex items-center px-8 py-4 h-14 bg-gray-200 rounded-[50px] text-base text-gray-600"
          >
            Extra large pill with 50px border-radius
          </Shimmer>
        </div>
      </div>

      {/* Comparison with default shimmer */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Comparison</h3>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Default:</span>
          <Shimmer 
            isLoading={isLoading}
            className="inline-flex items-center px-4 py-2 h-10 bg-gray-200 rounded-full text-sm text-gray-600"
          >
            Default shimmer
          </Shimmer>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Pill variant:</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            className="inline-flex items-center px-4 py-2 h-10 bg-gray-200 rounded-full text-sm text-gray-600"
          >
            Pill shimmer
          </Shimmer>
        </div>
      </div>

      {/* Different background colors */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Different Backgrounds</h3>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Dark bg:</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            className="inline-flex items-center px-4 py-2 h-10 bg-gray-700 rounded-full text-sm text-gray-300"
          >
            Dark background
          </Shimmer>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Brand bg:</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            className="inline-flex items-center px-4 py-2 h-10 bg-brand-500 rounded-full text-sm text-white"
          >
            Brand background
          </Shimmer>
        </div>
      </div>

      {/* Custom duration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Custom Animation Speed</h3>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Fast (0.8s):</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            duration={0.8}
            className="inline-flex items-center px-4 py-2 h-10 bg-gray-200 rounded-full text-sm text-gray-600"
          >
            Fast animation
          </Shimmer>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-600 w-24">Slow (3s):</span>
          <Shimmer 
            variant="pill" 
            isLoading={isLoading}
            duration={3}
            className="inline-flex items-center px-4 py-2 h-10 bg-gray-200 rounded-full text-sm text-gray-600"
          >
            Slow animation
          </Shimmer>
        </div>
      </div>
    </div>
  );
}