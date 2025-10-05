import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, setLogLevel } from 'firebase/firestore';

// --- Global Variables (Mandatory for Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
setLogLevel('Debug'); // Enable Firebase debug logging

// --- Utility: Icon SVGs ---
const Icon = ({ name, className }) => {
  switch (name) {
    case 'Car':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.7-2.2L16 7v-2c0-.6-.4-1-1-1h-2c-.6 0-1 .4-1 1v2l-3 3.5v-3.5c0-.6-.4-1-1-1H5c-.6 0-1 .4-1 1v2h2c.6 0 1 .4 1 1v3c0 .9-.7 1.7-1.7 2.2L2 15v1c0 .6.4 1 1 1h2m14 0h-2m-8 0H9m-2 0H5m14 0c-.8 0-1.5-.7-1.5-1.5S18.2 14 19 14s1.5.7 1.5 1.5S19.8 17 19 17zM5 17c-.8 0-1.5-.7-1.5-1.5S4.2 14 5 14s1.5.7 1.5 1.5S5.8 17 5 17zM9 17h6m-3-7V7"/></svg>;
    case 'DollarSign':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
    case 'MapPin':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 17.5l-3.5-3.5a5 5 0 0 1 7 0L12 17.5z"></path><circle cx="12" cy="10" r="3"></circle><path d="M12 21.5s-7-5.5-7-10c0-3.9 3.1-7 7-7s7 3.1 7 7c0 4.5-7 10-7 10z"></path></svg>;
    case 'CheckCircle':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="M9 11l3 3L22 4"></path></svg>;
    case 'ArrowLeft':
      return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>;
    default:
      return <div className={className}></div>;
  }
};

// --- Registration Form Step Data ---
const steps = [
  { id: 1, name: 'Personal Details' },
  { id: 2, name: 'Vehicle Details' },
  { id: 3, name: 'Review & Submit' },
];

// --- Registration Form UI Components ---

const Input = ({ label, name, type, value, onChange, min, required }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      id={name}
      value={value || ''}
      onChange={onChange}
      min={min}
      required={required}
      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
    />
  </div>
);

const Select = ({ label, name, value, onChange, options, required }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      id={name}
      name={name}
      value={value || ''}
      onChange={onChange}
      required={required}
      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm transition duration-150 ease-in-out"
    >
      <option value="" disabled>Select coverage type</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

const SectionTitle = ({ title }) => (
  <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">{title}</h2>
);

const DetailCard = ({ title, children }) => (
  <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
    <h3 className="text-lg font-semibold text-indigo-600 mb-2">{title}</h3>
    <div className="space-y-1 text-sm text-gray-700">{children}</div>
  </div>
);

const DetailItem = ({ label, value }) => (
  <p>
    <span className="font-medium text-gray-500">{label}:</span> <span className="font-semibold block sm:inline-block ml-0 sm:ml-2">{value}</span>
  </p>
);

// --- Step 1: Personal Details Form ---
const StepPersonal = ({ formData, handleChange }) => (
  <div className="space-y-4">
    <Input label="Full Name" name="fullName" type="text" value={formData.fullName} onChange={handleChange} required />
    <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required />
    <Input label="Phone Number (e.g., +44 7700 900000)" name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
    <Input label="Primary Operating City (e.g., Berlin, Germany)" name="city" type="text" value={formData.city} onChange={handleChange} required />
  </div>
);

// --- Step 2: Vehicle Details Form ---
const StepVehicle = ({ formData, handleChange }) => (
  <div className="space-y-4">
    <Input label="Vehicle Make (e.g., Volkswagen)" name="make" type="text" value={formData.make} onChange={handleChange} required />
    <Input label="Vehicle Model (e.g., Golf, Passat)" name="model" type="text" value={formData.model} onChange={handleChange} required />
    <Input label="Year of Manufacture (e.g., 2018)" name="year" type="number" value={formData.year} onChange={handleChange} required />
    <Select
      label="Desired Ad Coverage"
      name="coverage"
      value={formData.coverage}
      onChange={handleChange}
      options={[
        { value: 'partial', label: 'Partial Wrap (Doors only)' },
        { value: 'full', label: 'Full Wrap (Excl. Windows)' },
        { value: 'magnets', label: 'Magnetic Decals Only' },
      ]}
      required
    />
    <Input label="Average Weekly Mileage (Estimate)" name="mileage" type="number" value={formData.mileage} onChange={handleChange} min="50" required />
  </div>
);

// --- Step 3: Review and Confirmation ---
const StepReview = ({ formData }) => (
  <div className="space-y-6">
    <SectionTitle title="Review Your Application" />
    <DetailCard title="Personal Details">
      <DetailItem label="Name" value={formData.fullName} />
      <DetailItem label="Email" value={formData.email} />
      <DetailItem label="City" value={formData.city} />
    </DetailCard>

    <DetailCard title="Vehicle Details">
      <DetailItem label="Vehicle" value={`${formData.year} ${formData.make} ${formData.model}`} />
      <DetailItem label="Coverage" value={formData.coverage} />
      <DetailItem label="Weekly Mileage" value={`${formData.mileage} km`} />
    </DetailCard>

    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
      <h4 className="font-semibold">Next Steps:</h4>
      <p className="mt-1">By clicking "Submit," you agree to our terms. We will verify your details and contact you within 48 hours with compensation details and installation options.</p>
    </div>
  </div>
);


// --- Landing Page UI Components ---

const FeatureCard = ({ iconName, title, description, isOwner }) => (
  <div className={`p-6 rounded-xl shadow-lg transition-transform duration-300 ${isOwner ? 'bg-white hover:shadow-xl hover:scale-[1.02] border-t-4 border-indigo-500' : 'bg-indigo-50 hover:shadow-lg border-t-4 border-gray-200'}`}>
    <Icon name={iconName} className="w-8 h-8 text-indigo-600 mb-3" />
    <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);


// --- Registration Form Component (Handles Authentication and Firestore) ---
const RegistrationForm = ({ setView }) => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'success', 'error', or null

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    make: '',
    model: '',
    year: '',
    coverage: '',
    mileage: 0,
    registrationDate: new Date().toISOString(),
    status: 'Pending',
  });

  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    if (!firebaseConfig || !Object.keys(firebaseConfig).length) {
      console.error("Firebase configuration is missing.");
      setIsAuthReady(true);
      return;
    }

    try {
      const firebaseApp = initializeApp(firebaseConfig);
      const firestore = getFirestore(firebaseApp);
      const firebaseAuth = getAuth(firebaseApp);

      setDb(firestore);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // If no user, try to sign in with custom token or anonymously
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            const anonymousUser = await signInAnonymously(firebaseAuth);
            setUserId(anonymousUser.user.uid);
          }
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Error initializing Firebase or signing in:", e);
      setIsAuthReady(true);
    }
  }, []);

  // 2. Form Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = (step) => {
    const requiredFields = {
      1: ['fullName', 'email', 'phone', 'city'],
      2: ['make', 'model', 'year', 'coverage', 'mileage'],
    };

    if (!requiredFields[step]) return true;

    for (const field of requiredFields[step]) {
      if (!formData[field] || String(formData[field]).trim() === '') {
        return false;
      }
    }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (isFormValid(currentStep) && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      console.warn("Please fill in all required fields.");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 3. Firestore Submission Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid(2)) {
        setSubmissionStatus('error');
        console.error("Form validation failed before submission.");
        return;
    }

    if (!db || !userId) {
      console.error("Firestore database or user ID is not available.");
      setSubmissionStatus('error');
      return;
    }

    setLoading(true);

    const userRegistrationRef = doc(
      db,
      `artifacts/${appId}/users/${userId}/registrations`,
      'vehicle_registration'
    );

    try {
      await setDoc(userRegistrationRef, formData);
      setSubmissionStatus('success');
      console.log("Registration successfully submitted and saved to Firestore.");
    } catch (error) {
      console.error("Error submitting registration to Firestore:", error);
      setSubmissionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepPersonal formData={formData} handleChange={handleChange} />;
      case 2:
        return <StepVehicle formData={formData} handleChange={handleChange} />;
      case 3:
        return <StepReview formData={formData} />;
      default:
        return null;
    }
  };

  // Submission Status Views
  if (submissionStatus === 'success') {
    return (
      <div className="w-full h-full p-8 text-center flex flex-col justify-center items-center">
        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Registration Complete!</h1>
        <p className="text-gray-600 max-w-sm">Thank you for registering your vehicle. We will contact you within 48 hours.</p>
        <button
          onClick={() => setView('landing')}
          className="mt-6 inline-flex items-center justify-center px-6 py-2 text-sm font-semibold rounded-lg shadow-md text-white bg-indigo-600 hover:bg-indigo-700 transition duration-300"
        >
          <Icon name="ArrowLeft" className="w-4 h-4 mr-2" /> Back to Home
        </button>
        <p className="mt-4 text-xs text-gray-400">User ID: {userId}</p>
      </div>
    );
  }

  if (submissionStatus === 'error') {
    return (
      <div className="w-full h-full p-8 text-center flex flex-col justify-center items-center">
        <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Submission Failed</h1>
        <p className="text-gray-600 max-w-sm">There was an error saving your data. Please try again.</p>
        <button
          onClick={() => setSubmissionStatus(null)}
          className="mt-6 inline-flex items-center justify-center px-6 py-2 text-sm font-semibold rounded-lg shadow-md text-white bg-red-600 hover:bg-red-700 transition duration-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Main Registration Form View
  return (
    <div className="w-full h-full p-6 sm:p-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-extrabold text-indigo-600">
            Car Registration
        </h1>
        <button
          onClick={() => setView('landing')}
          className="text-sm font-medium text-gray-500 hover:text-indigo-600 flex items-center"
        >
          <Icon name="ArrowLeft" className="w-4 h-4 mr-1"/> Home
        </button>
      </div>

      {/* Stepper Indicator */}
      <div className="flex justify-between items-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={`flex flex-col items-center ${step.id <= currentStep ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${step.id === currentStep ? 'bg-indigo-600 text-white shadow-lg' : step.id < currentStep ? 'bg-indigo-100 border-2 border-indigo-600' : 'bg-gray-200'}`}>
                {step.id < currentStep ? (
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                  step.id
                )}
              </div>
              <span className="text-xs mt-1 text-center hidden sm:block">{step.name}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 ${step.id < currentStep ? 'bg-indigo-600' : 'bg-gray-200'} rounded-full transition-colors duration-300`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={currentStep === steps.length ? handleSubmit : handleNext}>
        {renderStep()}

        {/* Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out ${
              currentStep === 1 || loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-600 shadow-md'
            }`}
          >
            Back
          </button>

          <button
            type="submit"
            disabled={loading || !isAuthReady}
            className={`flex items-center justify-center py-2 px-6 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 ease-in-out ${
              loading || !isAuthReady
                ? 'bg-indigo-300 cursor-wait'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl'
            }`}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : currentStep === steps.length ? (
              'Submit Application'
            ) : (
              'Next Step'
            )}
          </button>
        </div>
        {!isAuthReady && <p className="mt-4 text-center text-sm text-yellow-600">Connecting securely...</p>}
      </form>
    </div>
  );
};


// --- Landing Page Component ---
const LandingPage = ({ setView }) => {
  return (
    <div className="w-full h-full">
      {/* === Hero Section === */}
      <header className="p-8 sm:p-10 bg-indigo-600 text-white text-center rounded-t-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 leading-tight">
          WrapRewards
        </h1>
        <p className="text-indigo-100 text-lg sm:text-xl font-light">
          Turn your daily drive into a powerful revenue stream.
        </p>
        <button
          onClick={() => setView('register')}
          className="mt-6 inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-bold rounded-full shadow-2xl text-indigo-900 bg-white hover:bg-indigo-50 transition duration-300 transform hover:scale-[1.05]"
        >
          Start Earning Now
        </button>
      </header>

      <main className="p-6 sm:p-8 space-y-12">
        
        {/* === How It Works Section === */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">
            Simple. Smart. Passive Income.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <Icon name="Car" className="w-10 h-10 text-indigo-500 mx-auto mb-3"/>
              <h3 className="font-bold text-lg text-gray-800">1. Register Your Ride</h3>
              <p className="text-gray-500 text-sm mt-1">Tell us about your vehicle and your driving routes.</p>
            </div>
            <div className="text-center p-4">
              <Icon name="MapPin" className="w-10 h-10 text-indigo-500 mx-auto mb-3"/>
              <h3 className="font-bold text-lg text-gray-800">2. Match & Wrap</h3>
              <p className="text-gray-500 text-sm mt-1">We match you with a relevant, non-damaging ad campaign.</p>
            </div>
            <div className="text-center p-4">
              <Icon name="DollarSign" className="w-10 h-10 text-indigo-500 mx-auto mb-3"/>
              <h3 className="font-bold text-lg text-gray-800">3. Get Paid Monthly</h3>
              <p className="text-gray-500 text-sm mt-1">Drive as usual and watch the income roll in.</p>
            </div>
          </div>
        </section>

        {/* === Car Owner Benefits === */}
        <section className="bg-indigo-50 p-6 sm:p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
            Benefits for Car Owners
          </h2>
          <div className="grid grid-cols-1 gap-6">
            <FeatureCard
              isOwner={true}
              iconName="DollarSign"
              title="Guaranteed Income"
              description="Earn up to $500 per month just for driving your car as you normally would."
            />
            <FeatureCard
              isOwner={true}
              iconName="CheckCircle"
              title="Zero Vehicle Damage"
              description="We use professional-grade, non-damaging vinyl wraps that are easily removable."
            />
          </div>
        </section>

        {/* === Advertiser Pitch === */}
        <section className="p-6 sm:p-8 rounded-xl border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            A New Channel for Advertisers
          </h2>
          <div className="grid grid-cols-1 gap-6">
            <FeatureCard
              isOwner={false}
              iconName="MapPin"
              title="Hyper-Local Targeting"
              description="Target specific neighborhoods, cities, and demographics based on driver routes."
            />
            <FeatureCard
              isOwner={false}
              iconName="Car"
              title="Massive Impressions"
              description="Each wrapped vehicle generates thousands of impressions daily in high-traffic areas."
            />
          </div>
        </section>

        {/* === Final CTA === */}
        <footer className="text-center pt-4">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Ready to Join the Movement?</h2>
          <button
            onClick={() => setView('register')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 border border-transparent text-lg font-extrabold rounded-xl shadow-xl text-white bg-indigo-600 hover:bg-indigo-700 transition duration-300 transform hover:scale-[1.02]"
          >
            Sign Up Your Car Now
          </button>
          <p className="mt-3 text-sm text-gray-400">Takes less than 5 minutes to apply.</p>
        </footer>
      </main>
    </div>
  );
};


// --- Main Application Router Component ---
export default function App() {
  // State to control which view is currently displayed ('landing' or 'register')
  const [currentView, setCurrentView] = useState('landing');

  const renderView = () => {
    switch (currentView) {
      case 'register':
        return <RegistrationForm setView={setCurrentView} />;
      case 'landing':
      default:
        return <LandingPage setView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8 font-inter">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {renderView()}
        {currentView === 'register' && (
          <div className="p-4 text-center text-xs text-gray-400 border-t mt-4">
            Data secured with Firebase Firestore.
          </div>
        )}
      </div>
    </div>
  );
}
