import React, { useState, useEffect } from 'react';
// We are removing the import './App.css' here and relying on src/index.css
import { Zap, DollarSign, Truck, Shield, Link, BarChart3, Users } from 'lucide-react';

const App = () => {
  // Simple state management (optional for a static landing page, but good practice)
  const [showModal, setShowModal] = useState(false);

  // Data structure for steps
  const steps = [
    { 
      id: 1, 
      icon: <Truck className="w-8 h-8 text-white" />, 
      title: "Register Your Ride", 
      description: "Tell us about your vehicle and your driving routes." 
    },
    { 
      id: 2, 
      icon: <Link className="w-8 h-8 text-white" />, 
      title: "Match & Wrap", 
      description: "We analyze your profile and match you with a high-paying brand campaign." 
    },
    { 
      id: 3, 
      icon: <DollarSign className="w-8 h-8 text-white" />, 
      title: "Get Paid Monthly", 
      description: "Receive guaranteed passive income deposited directly into your account." 
    },
  ];

  // Data structure for benefits
  const carOwnerBenefits = [
    { 
      id: 1, 
      icon: <DollarSign className="w-6 h-6 text-indigo-600" />, 
      title: "Guaranteed Income", 
      description: "Turn your daily commute into a reliable, consistent income stream without extra effort." 
    },
    { 
      id: 2, 
      icon: <Shield className="w-6 h-6 text-indigo-600" />, 
      title: "Zero Vehicle Damage", 
      description: "High-quality, removable vinyl wraps protect your paint and leave no residue upon removal." 
    },
    { 
      id: 3, 
      icon: <Zap className="w-6 h-6 text-indigo-600" />, 
      title: "Flexible Campaigns", 
      description: "Choose campaigns that fit your lifestyle and your geographic location." 
    },
  ];

  const advertiserBenefits = [
    { 
      id: 1, 
      icon: <BarChart3 className="w-6 h-6 text-indigo-600" />, 
      title: "Superior ROI", 
      description: "Target specific demographics and geographies with a high-impact, mobile ad format." 
    },
    { 
      id: 2, 
      icon: <Users className="w-6 h-6 text-indigo-600" />, 
      title: "High Visibility", 
      description: "Achieve massive local exposure on major roadways and urban centers, reaching thousands daily." 
    },
    { 
      id: 3, 
      icon: <Truck className="w-6 h-6 text-indigo-600" />, 
      title: "Detailed Analytics", 
      description: "Get real-time data on campaign reach, impressions, and driver routes." 
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Header and Hero Section */}
      <header className="w-full bg-indigo-600 text-white shadow-lg p-6 mb-10 rounded-b-xl max-w-lg">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">WrapRewards</h1>
          <p className="mt-2 text-indigo-100 text-lg">Turn your daily drive into passive income.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="mt-6 w-4/5 py-3 bg-white text-indigo-700 font-bold rounded-full shadow-2xl hover:bg-gray-100 transition duration-150 transform hover:scale-105"
          >
            Start Earning Now
          </button>
        </div>
      </header>

      <main className="w-full max-w-lg px-4 space-y-12 pb-12">
        {/* How It Works Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Simple, Smart, Passive Income.
          </h2>
          <div className="space-y-6">
            {steps.map(step => (
              <div key={step.id} className="flex items-start space-x-4 bg-white p-4 rounded-xl shadow-md border-t-4 border-indigo-500">
                <div className="flex-shrink-0 bg-indigo-600 p-3 rounded-full shadow-lg">
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{step.id}. {step.title}</h3>
                  <p className="mt-1 text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits for Car Owners Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Benefits for Car Owners
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {carOwnerBenefits.map(benefit => (
              <div key={benefit.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center mb-3">
                  {benefit.icon}
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">{benefit.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* New Channel for Advertisers Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            A New Channel for Advertisers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {advertiserBenefits.map(benefit => (
              <div key={benefit.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center mb-3">
                  {benefit.icon}
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">{benefit.title}</h3>
                </div>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mt-10 p-4 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} WrapRewards. All rights reserved.
      </footer>

      {/* Simple Modal for "Start Earning Now" */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-100">
            <h3 className="text-xl font-bold text-indigo-700 mb-4">Registration Portal</h3>
            <p className="text-gray-600 mb-6">
              Thank you for your interest! Our full registration app is launching soon.
              Please check back later or visit our main site for updates.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
