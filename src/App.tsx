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
import { AccountSettings } from './components/AccountSettings';
import { LogDeliveryModal } from './components/LogDeliveryModal';
import { DeliveryLogsModal } from './components/DeliveryLogsModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { SignOutConfirmationModal } from './components/SignOutConfirmationModal';
import { CategoryManager } from './components/CategoryManager';
import { Toast } from './components/Toast';
import { LoadingScreen } from './components/LoadingScreen';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrescriptionForLogs, setSelectedPrescriptionForLogs] = useState<Prescription | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedPrescriptionForDelete, setSelectedPrescriptionForDelete] = useState<Prescription | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddPrescriptionForm, setShowAddPrescriptionForm] = useState(false);
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

  const handleDeletePrescription = (prescription: Prescription) => {
    setSelectedPrescriptionForDelete(prescription);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (prescription: Prescription) => {
    if (!user) {
      showToast('You must be signed in.', true);
      return;
    }

    try {
      await deletePrescription(user.uid, prescription.id);
      showToast(`${prescription.name} deleted successfully.`);
      setIsDeleteModalOpen(false);
      setSelectedPrescriptionForDelete(null);
    } catch (error) {
      console.error('Error deleting prescription:', error);
      showToast(`Error deleting ${prescription.name}. Please try again.`, true);
      throw error; // Re-throw so modal can handle it
    }
  };


  const handleSignOut = () => {
    setIsSignOutModalOpen(true);
  };

  const handleConfirmSignOut = async () => {
    try {
      await signOutAuth();
      showToast('Signed out successfully.');
      setIsSignOutModalOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Error signing out. Please try again.', true);
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
  };

  return (
    <>
      {showLoadingScreen && (
        <LoadingScreen isLoading={isLoading} onLoaded={handleLoadingComplete} />
      )}
      <div
        className={`min-h-screen bg-gray-100 dark:bg-gray-900 transition-opacity duration-500 ${
          showLoadingScreen ? 'opacity-0' : 'opacity-100'
        }`}
      >
      <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-4xl">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-800 dark:text-blue-400 mb-1 sm:mb-2">
                My Prescription Tracker
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
                Never miss a re-order date again.
              </p>
            </div>
            {user && (
              <div className="flex flex-col sm:items-end gap-2">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all sm:break-normal">
                  {user.displayName || user.email}
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowCategoryManager(true)}
                    className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                  >
                    Categories
                  </button>
                  <button
                    onClick={() => setShowAccountSettings(true)}
                    className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
                  >
                    Account
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
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

            <div className="mb-6 sm:mb-8">
              <button
                onClick={() => setShowAddPrescriptionForm(true)}
                className="w-full sm:w-auto bg-blue-600 dark:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add New Prescription
              </button>
            </div>

            {showAddPrescriptionForm && (
              <AddPrescriptionForm
                userId={user.uid}
                onPrescriptionAdded={() => {
                  // Don't close here - let handleClose handle it with animation
                }}
                onClose={() => {
                  // Component handles animation timing, just close immediately
                  setShowAddPrescriptionForm(false);
                }}
                onError={(message) => showToast(message, true)}
                onSuccess={(message) => {
                  showToast(message);
                  // Don't close here - let handleClose handle it with animation
                }}
              />
            )}

            <div className="space-y-6 sm:space-y-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                  My Medications
                </h2>
                <PrescriptionList
                  userId={user.uid}
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

        <DeleteConfirmationModal
          prescription={selectedPrescriptionForDelete}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedPrescriptionForDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          onError={(message) => showToast(message, true)}
        />

        <SignOutConfirmationModal
          isOpen={isSignOutModalOpen}
          onClose={() => {
            setIsSignOutModalOpen(false);
          }}
          onConfirm={handleConfirmSignOut}
          onError={(message) => showToast(message, true)}
        />

        {user && (
          <>
            <CategoryManager
              userId={user.uid}
              isOpen={showCategoryManager}
              onClose={() => {
                setShowCategoryManager(false);
              }}
              onError={(message) => showToast(message, true)}
              onSuccess={(message) => showToast(message)}
            />
            <AccountSettings
              user={user}
              isOpen={showAccountSettings}
              onClose={() => {
                setShowAccountSettings(false);
              }}
              onError={(message) => showToast(message, true)}
              onSuccess={(message) => showToast(message)}
              onAccountDeleted={() => {
                setUser(null);
                setShowAccountSettings(false);
              }}
            />
          </>
        )}

        <Toast
          message={toastMessage}
          isError={isToastError}
          onClose={() => setToastMessage('')}
        />
      </div>
      </div>
    </>
  );
}

export default App;

