import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initializeFirebase } from './firebase/config';
import { onAuthStateChange, signOutAuth } from './services/authService';
import { subscribeToPrescriptions, logDelivery, deletePrescription } from './services/prescriptionService';
import { Prescription } from './types';
import { AddPrescriptionForm } from './components/AddPrescriptionForm';
import { PrescriptionList } from './components/PrescriptionList';
import { CalendarView } from './components/CalendarView';
import { SignInForm } from './components/SignInForm';
import { MFASettings } from './components/MFASettings';
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
  const [showMFASettings, setShowMFASettings] = useState(false);
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
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {user.displayName || user.email}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMFASettings(!showMFASettings)}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                  >
                    {showMFASettings ? 'Hide' : 'MFA'} Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {!user ? (
          <SignInForm
            onError={(message) => showToast(message, true)}
            onSuccess={(message) => showToast(message)}
          />
        ) : (
          <>
            {showMFASettings && (
              <div className="mb-8">
                <MFASettings
                  user={user}
                  onError={(message) => showToast(message, true)}
                  onSuccess={(message) => showToast(message)}
                />
              </div>
            )}

            <AddPrescriptionForm
              userId={user.uid}
              onPrescriptionAdded={() => {}}
              onError={(message) => showToast(message, true)}
              onSuccess={(message) => showToast(message)}
            />

            <div className="space-y-8">
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

              {prescriptions.length > 0 && (
                <div>
                  <CalendarView prescriptions={prescriptions} />
                </div>
              )}
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

