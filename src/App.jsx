import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- FIREBASE IMPORTS RESTORED ---
// The previous attempt to load these globally in index.html failed, resulting in 'initializeApp is not defined'.
// Restoring direct module imports to ensure functions are available in the component scope.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURATION CONSTANTS (Assumed to be globally available in this environment) ---
// These variables are required for Firebase initialization in the Canvas environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- UTILITY COMPONENTS ---

// Custom Modal component to replace alert() and confirm()
const Modal = ({ title, message, isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all">
        <h3 className="text-xl font-bold text-indigo-700 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md"
        >
          Close
        </button>
      </div>
    </div>
  );
};


// --- FIREBASE INITIALIZATION AND AUTH HOOK ---

const useFirebase = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Use a ref to ensure initialization only runs once
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    try {
      // NOTE: initializeApp, getAuth, getFirestore are now available via direct imports.
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      
      setDb(firestore);
      setAuth(firebaseAuth);

      // 1. Authenticate (Custom token for Canvas, Anonymous otherwise)
      const authenticate = async () => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            // Fallback to anonymous sign-in if no token is provided
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Firebase Auth Error:", error);
          // If custom token fails, try anonymous sign-in
          await signInAnonymously(firebaseAuth);
        }
      };
      
      authenticate();

      // 2. Auth State Listener
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        // Use user's UID if logged in, otherwise use a random ID for unauthenticated interactions
        const currentUserId = user ? user.uid : crypto.randomUUID();
        setUserId(currentUserId);
        setIsAuthReady(true);
        console.log("Auth State Changed. User ID:", currentUserId);
      });

      return () => unsubscribe(); // Cleanup auth listener
    } catch (error) {
      console.error("Firebase Initialization Failed:", error);
    }
  }, []);

  return { db, auth, userId, isAuthReady };
};


// --- REGISTRATION FORM LOGIC ---

// Defines the initial state for the vehicle registration data
const initialVehicleState = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  make: '',
  model: '',
  year: '',
  mileage: '',
  wrapExperience: 'No',
  isApproved: false,
};

const RegistrationForm = ({ db, auth, userId, isAuthReady }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialVehicleState);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '' });
  const [isRegistered, setIsRegistered] = useState(false);

  // Firestore path for this specific application's user data
  const userRegistrationPath = `artifacts/${appId}/users/${userId}/registrations/vehicle_registration`;

  // Fetch existing registration data on load
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;

    // Use onSnapshot to listen for real-time changes
    const unsub = onSnapshot(doc(db, userRegistrationPath), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setFormData(prev => ({ ...prev, ...data }));
        setIsRegistered(true);
        console.log("Existing registration loaded:", data);
      } else {
        setIsRegistered(false);
        console.log("No existing registration found.");
      }
    }, (error) => {
      console.error("Error fetching document:", error);
    });

    return () => unsub();
  }, [db, userId, isAuthReady]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);
  
  const handleHome = () => {
      setStep(0); // Go to Landing Page (step 0 defined below)
  }

  const handleSubmit = async () => {
    setLoading(true);
    
    // Basic validation for Step 1
    if (step === 1 && (!formData.fullName || !formData.email || !formData.phone || !formData.city)) {
        setModal({ isOpen: true, title: "Validation Error", message: "Please fill out all required fields in Personal Details." });
        setLoading(false);
        return;
    }
    
    // Basic validation for Step 2
    if (step === 2 && (!formData.make || !formData.model || !formData.year || !formData.mileage)) {
        setModal({ isOpen: true, title: "Validation Error", message: "Please fill out all required fields in Vehicle Details." });
        setLoading(false);
        return;
    }


    if (step < 3) {
      handleNext();
      setLoading(false);
      return;
    }

    // Final Submission (Step 3)
    if (!db || !userId) {
        setModal({ isOpen: true, title: "Error", message: "Database connection failed. Please try again." });
        setLoading(false);
        return;
    }
    
    try {
        // Use setDoc with merge: true to save the data. It creates the document if it doesn't exist, or updates it otherwise.
        await setDoc(doc(db, userRegistrationPath), {
            ...formData,
            userId: userId, // Store the user ID for reference
            timestamp: new Date().toISOString(),
        }, { merge: true });

        setModal({ 
            isOpen: true, 
            title: isRegistered ? "Update Successful!" : "Registration Complete!", 
            message: `Your vehicle application has been successfully ${isRegistered ? 'updated' : 'submitted'} and is awaiting review. Your data is secured under User ID: ${userId}` 
        });
        setIsRegistered(true);
        setStep(0); // Navigate to landing page after success

    } catch (error) {
        console.error("Error saving document: ", error);
        setModal({ isOpen: true, title: "Submission Failed", message: `An error occurred: ${error.message}` });
    } finally {
        setLoading(false);
    }
  };


  // --- STEP RENDERING ---
  
  const renderFormStep = () => {
    switch (step) {
      case 1: // Personal Details
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-indigo-700">1. Personal Details</h2>
            <p className="text-sm text-gray-500">Let us know who you are.</p>
            <Input label="Full Name *" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" required />
            <Input label="Email Address *" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" type="email" required />
            <Input label="Phone Number (e.g., +44 7700 900000) *" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" required />
            <Input label="Primary Operating City (e.g., Berlin, Germany) *" name="city" value={formData.city} onChange={handleChange} placeholder="San Francisco, CA" required />
          </div>
        );
      case 2: // Vehicle Details
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-indigo-700">2. Vehicle Details</h2>
            <p className="text-sm text-gray-500">Tell us about your ride.</p>
            <Input label="Vehicle Make *" name="make" value={formData.make} onChange={handleChange} placeholder="Honda" required />
            <Input label="Vehicle Model *" name="model" value={formData.model} onChange={handleChange} placeholder="Civic" required />
            <Input label="Year of Vehicle *" name="year" value={formData.year} onChange={handleChange} placeholder="2020" type="number" required />
            <Input label="Approximate Current Mileage *" name="mileage" value={formData.mileage} onChange={handleChange} placeholder="35000" type="number" required />
            <Select 
                label="Prior Vehicle Wrap Experience?" 
                name="wrapExperience" 
                value={formData.wrapExperience} 
                onChange={handleChange}
                options={['No', 'Yes']}
            />
          </div>
        );
      case 3: // Review & Submit
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-indigo-700">3. Review & Submit</h2>
            <p className="text-sm text-gray-500">Please review your information before submitting.</p>
            <ReviewItem label="Name" value={formData.fullName} />
            <ReviewItem label="Email" value={formData.email} />
            <ReviewItem label="Phone" value={formData.phone} />
            <ReviewItem label="City" value={formData.city} />
            <ReviewItem label="Vehicle" value={`${formData.year} ${formData.make} ${formData.model}`} />
            <ReviewItem label="Mileage" value={`${formData.mileage} miles`} />
            <ReviewItem label="Wrap Experience" value={formData.wrapExperience} />
            <div className={`p-4 rounded-lg mt-6 ${isRegistered ? 'bg-yellow-50 border border-yellow-300' : 'bg-indigo-50 border border-indigo-200'}`}>
                <p className="text-sm font-medium text-gray-700">
                    {isRegistered ? '⚠️ Warning: Submitting will update your existing registration.' : '✅ Confirmation: Your information will be securely saved to Firebase Firestore.'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Your data is secured by Firebase Firestore under the path: `artifacts/${appId}/users/{userId}/registrations/vehicle_registration`
                </p>
            </div>
          </div>
        );
      default:
        // Step 0 is the Landing Page (handled in main App component)
        return null;
    }
  };

  const formContent = (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900">{isRegistered ? 'Update Vehicle Application' : 'Car Registration'}</h1>
        <button 
            onClick={handleHome} 
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition duration-150 flex items-center"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.954L12 2.25l7.954 7.954V18.75A2.25 2.25 0 0117.75 21H6.75A2.25 2.25 0 014.5 18.75V10.796L2.25 12z" />
            </svg>
            Home
        </button>
      </div>

      <ProgressBar currentStep={step} isRegistered={isRegistered} />
      
      <div className="mt-8">
        {renderFormStep()}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-sm"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`flex items-center justify-center font-semibold py-2 px-6 rounded-lg transition duration-200 shadow-lg ${
            loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          } ${step === 1 && 'ml-auto'}`}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            step === 3 ? (isRegistered ? 'Update Application' : 'Confirm & Submit') : 'Next Step'
          )}
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="max-w-3xl mx-auto my-8 bg-white rounded-2xl shadow-xl">
        <Modal {...modal} onClose={() => setModal({ ...modal, isOpen: false })} />
        {step > 0 ? formContent : <LandingPage setStep={setStep} />}
    </div>
  );
};


// --- FORM HELPER COMPONENTS ---

const Input = ({ label, name, value, onChange, placeholder, type = 'text', required = false }) => (
  <div className="flex flex-col">
    <label htmlFor={name} className="text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
    />
  </div>
);

const Select = ({ label, name, value, onChange, options }) => (
  <div className="flex flex-col">
    <label htmlFor={name} className="text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition duration-150 bg-white"
    >
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

const ReviewItem = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b last:border-b-0">
    <span className="text-sm font-medium text-gray-500">{label}:</span>
    <span className="text-sm font-semibold text-gray-800">{value}</span>
  </div>
);

const ProgressBar = ({ currentStep, isRegistered }) => {
    const steps = [
        { id: 1, name: 'Personal Details' },
        { id: 2, name: 'Vehicle Details' },
        { id: 3, name: isRegistered ? 'Update & Review' : 'Review & Submit' },
    ];

    return (
        <nav className="flex items-center justify-between">
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                        <div 
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition duration-300 ${
                                currentStep === step.id 
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : currentStep > step.id
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-200 text-gray-500'
                            }`}
                        >
                            <span className="font-bold">{step.id}</span>
                        </div>
                        <span className={`mt-2 text-xs font-medium text-center ${currentStep >= step.id ? 'text-indigo-700' : 'text-gray-500'} hidden sm:block`}>{step.name}</span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`flex-auto border-t-2 transition duration-300 ${currentStep > step.id ? 'border-green-500' : 'border-gray-200'}`} />
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};


// --- LANDING PAGE COMPONENT ---

const FeatureCard = ({ icon, title, description }) => (
    <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-100 transform hover:scale-[1.02] transition duration-300">
        <div className="text-indigo-600 text-3xl mb-2">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
    </div>
);

const LandingPage = ({ setStep }) => {
    return (
        <div className="flex flex-col">
            {/* Header Section */}
            <header className="p-8 md:p-12 bg-indigo-700 rounded-t-2xl text-center shadow-2xl">
                <h1 className="text-4xl font-extrabold text-white mb-2">WrapRewards</h1>
                <p className="text-xl text-indigo-200 mb-8">Turn your daily drive into a powerful revenue stream.</p>
                <button
                    onClick={() => setStep(1)}
                    className="bg-white text-indigo-700 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-indigo-50 transition duration-300 transform hover:scale-105"
                >
                    Start Earning Now
                </button>
            </header>

            {/* How It Works Section */}
            <section className="p-8 md:p-12 bg-white">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Simple. Smart. Passive Income.</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <FeatureCard
                        icon="🚗"
                        title="1. Register Your Ride"
                        description="Tell us about your vehicle and your driving routes."
                    />
                    <FeatureCard
                        icon="📍"
                        title="2. Match & Wrap"
                        description="We match you with a relevant, non-damaging ad campaign."
                    />
                    <FeatureCard
                        icon="💰"
                        title="3. Get Paid Monthly"
                        description="Drive as usual and watch the income roll in."
                    />
                </div>
            </section>

            {/* Benefits Section */}
            <section className="p-8 md:p-12 bg-indigo-50">
                <h2 className="text-2xl font-bold text-indigo-700 text-center mb-8">Benefits for Car Owners</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <BenefitItem 
                            icon="💵" 
                            title="Guaranteed Income" 
                            description="Earn up to $500 per month just for driving your car as you normally would."
                        />
                        <BenefitItem 
                            icon="🛡️" 
                            title="Zero Vehicle Damage" 
                            description="We use professional-grade, non-damaging vinyl that protects your factory paint."
                        />
                    </div>
                    <div className="space-y-4">
                        <BenefitItem 
                            icon="💡" 
                            title="A New Channel for Advertisers" 
                            description="Give local brands moving billboards for high-impact, geo-targeted marketing."
                        />
                        <BenefitItem 
                            icon="🌎" 
                            title="Eco-Friendly Transit" 
                            description="Support sustainable local businesses and reduce reliance on static advertising."
                        />
                    </div>
                </div>
            </section>
            
            {/* CTA Footer */}
            <footer className="p-8 md:p-12 bg-indigo-700 text-center rounded-b-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">Ready to Start Earning?</h2>
                <p className="text-indigo-200 mb-6">Join the revolution of passive income for car owners today.</p>
                <button
                    onClick={() => setStep(1)}
                    className="bg-white text-indigo-700 font-bold py-3 px-8 rounded-full shadow-xl hover:bg-indigo-100 transition duration-300 transform hover:scale-105"
                >
                    Sign Up Your Car Now
                </button>
            </footer>
        </div>
    );
};

const BenefitItem = ({ icon, title, description }) => (
    <div className="flex items-start p-4 bg-white rounded-xl shadow-md border border-indigo-200">
        <div className="flex-shrink-0 text-3xl mr-4">{icon}</div>
        <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
        </div>
    </div>
);


// --- MAIN APP COMPONENT ---

export default function App() {
  const { db, auth, userId, isAuthReady } = useFirebase();
  const [currentPage, setCurrentPage] = useState('landing');
  
  // Renders a loading state until Firebase Auth is ready
  if (!isAuthReady) {
      return (
          <div className="flex items-center justify-center h-screen bg-gray-50">
              <div className="text-center p-6 bg-white rounded-xl shadow-lg">
                  <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-700 font-medium">Connecting to Secure Services...</p>
                  <p className="text-xs text-gray-500 mt-1">Authenticating User ID: {userId ? userId : 'Loading...'}</p>
              </div>
          </div>
      );
  }

  // Once auth is ready, render the main form/landing page
  return (
    <RegistrationForm 
        db={db} 
        auth={auth} 
        userId={userId} 
        isAuthReady={isAuthReady} 
        // We use the setStep prop to control navigation between landing and form.
        setStep={step => setCurrentPage(step === 0 ? 'landing' : 'form')}
    />
  );
}
