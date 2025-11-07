import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initializeFirebase } from './firebase/config';
import { onAuthStateChange, signInWithGoogle, signOutAuth } from './services/authService';
import { subscribeToPrescriptions, logDelivery, deletePrescription } from './services/prescriptionService';
import { Prescription } from './types';
import { AddPrescriptionForm } from './components/AddPrescriptionForm';
import { PrescriptionList } from './components/PrescriptionList';
import { LogDeliveryModal } from './components/LogDeliveryModal';
import { DeliveryLogsModal } from './components/DeliveryLogsModal';
import { Toast } from './components/Toast';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrescriptionForLogs, setSelectedPrescriptionForLogs] = useState<Prescription | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastError, setIsToastError] = useState(false);

  useEffect(() => {
    // Initialize Firebase
    try {
      initializeFirebase();
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      showToast('Error initializing app. Please check your Firebase configuration.', true);
      setIsLoading(false);
      return;
    }

    // Set up auth state listener
    const unsubscribeAuth = onAuthStateChange((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setPrescriptions([]);
      setIsLoadingPrescriptions(false);
      return;
    }

    // Set loading state when starting to fetch prescriptions
    setIsLoadingPrescriptions(true);

    // Subscribe to prescriptions
    const unsubscribe = subscribeToPrescriptions(user.uid, (prescriptionsList) => {
      setPrescriptions(prescriptionsList);
      setIsLoadingPrescriptions(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const showToast = (message: string, isError = false) => {
    setToastMessage(message);
    setIsToastError(isError);
  };

  const handleLogDelivery = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const handleViewLogs = (prescription: Prescription) => {
    setSelectedPrescriptionForLogs(prescription);
    setIsLogsModalOpen(true);
  };

  const handleSaveDelivery = async (
    prescriptionId: string,
    deliveryDate: Date,
    quantity: number
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    await logDelivery(user.uid, prescriptionId, deliveryDate, quantity);
  };

  const handleDeletePrescription = async (prescription: Prescription) => {
    if (!user) {
      showToast('You must be signed in.', true);
      return;
    }

    try {
      await deletePrescription(user.uid, prescription.id);
      showToast(`${prescription.name} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting prescription:', error);
      showToast(`Error deleting ${prescription.name}. Please try again.`, true);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      showToast('Error signing in with Google. Please try again.', true);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutAuth();
      showToast('Signed out successfully.');
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Error signing out. Please try again.', true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-4xl font-bold text-blue-800 mb-2">My Prescription Tracker</h1>
              <p className="text-lg text-gray-600">Never miss a re-order date again.</p>
            </div>
            {user && (
              <div className="flex flex-col items-end gap-2">
                <div className="text-sm text-gray-600">
                  {user.displayName || user.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {!user ? (
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              Please sign in with Google to access your prescription tracker.
            </p>
            <button
              onClick={handleSignIn}
              className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <AddPrescriptionForm
              userId={user.uid}
              onPrescriptionAdded={() => {}}
              onError={(message) => showToast(message, true)}
              onSuccess={(message) => showToast(message)}
            />

            <div>
              <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-6">My Medications</h2>
              <PrescriptionList
                prescriptions={prescriptions}
                isLoading={isLoadingPrescriptions}
                onLogDelivery={handleLogDelivery}
                onViewLogs={handleViewLogs}
                onDelete={handleDeletePrescription}
              />
            </div>
          </>
        )}

        <LogDeliveryModal
          prescription={selectedPrescription}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPrescription(null);
          }}
          onSave={handleSaveDelivery}
          onError={(message) => showToast(message, true)}
          onSuccess={(message) => showToast(message)}
        />

        <DeliveryLogsModal
          prescription={selectedPrescriptionForLogs}
          isOpen={isLogsModalOpen}
          onClose={() => {
            setIsLogsModalOpen(false);
            setSelectedPrescriptionForLogs(null);
          }}
        />

        <Toast
          message={toastMessage}
          isError={isToastError}
          onClose={() => setToastMessage('')}
        />
      </div>
    </div>
  );
}

export default App;

