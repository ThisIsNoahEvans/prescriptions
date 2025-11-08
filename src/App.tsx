import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { useDarkMode } from './hooks/useDarkMode';
import { UserMenu } from './components/UserMenu';

function App() {
  // Initialize dark mode detection
  useDarkMode();
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
  const [activeView, setActiveView] = useState<'prescriptions' | 'calendar'>('prescriptions');

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

  // Combined loading state: wait for both auth and prescriptions to load
  const isFullyLoading = isLoading || (user !== null && isLoadingPrescriptions);

  return (
    <>
      {showLoadingScreen && (
        <LoadingScreen isLoading={isFullyLoading} onLoaded={handleLoadingComplete} />
      )}
      <div
        className={`min-h-screen bg-gray-100 dark:bg-gray-900 transition-all duration-500 ${
          showLoadingScreen ? 'opacity-0 scale-[1.15]' : 'opacity-100 scale-100'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 sm:py-8 md:py-10 lg:py-12">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-row justify-between items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-800 dark:text-blue-400 mb-1 sm:mb-2">
                My Prescription Tracker
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
                Never miss a re-order date again.
              </p>
            </div>
            {user && (
              <div className="flex-shrink-0">
                <UserMenu
                  user={user}
                  onShowCategories={() => setShowCategoryManager(true)}
                  onShowAccount={() => setShowAccountSettings(true)}
                  onSignOut={handleSignOut}
                />
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

            <div className="mb-6 sm:mb-8 lg:mb-6">
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

            {/* Desktop Layout: Prescriptions on left, Calendar on right (sticky) */}
            <div className="hidden lg:grid lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[2fr_1fr] lg:gap-8 xl:gap-12 lg:items-start">
              <div className="space-y-6">
                <div>
                  <PrescriptionList
                    userId={user.uid}
                    prescriptions={prescriptions}
                    isLoading={isLoadingPrescriptions}
                    onLogDelivery={handleLogDelivery}
                    onViewLogs={handleViewLogs}
                    onDelete={handleDeletePrescription}
                  />
                </div>
              </div>

              {prescriptions.length > 0 && (
                <div className="sticky top-4">
                  <CalendarView prescriptions={prescriptions} />
                </div>
              )}
            </div>

            {/* Mobile Layout: Tab bar at bottom to switch views */}
            <div className="lg:hidden pb-20">
              {activeView === 'prescriptions' && (
                <div className="space-y-6">
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
                </div>
              )}

              {activeView === 'calendar' && prescriptions.length > 0 && (
                <div>
                  <CalendarView prescriptions={prescriptions} />
                </div>
              )}
            </div>

            {/* Mobile Tab Bar - rendered via portal to avoid transform issues */}
            {user && typeof document !== 'undefined' && document.body && (
              createPortal(
                <div 
                  className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 backdrop-blur-md" 
                  style={{ 
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    backgroundColor: document.documentElement.classList.contains('dark') 
                      ? 'rgb(31, 41, 55)' // dark:bg-gray-800 fully opaque
                      : 'rgb(255, 255, 255)', // bg-white fully opaque
                  }}
                >
                  <div className="flex">
                    <button
                      onClick={() => setActiveView('prescriptions')}
                      className={`flex-1 flex flex-col items-center justify-center py-3 px-4 transition-colors ${
                        activeView === 'prescriptions'
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-xs font-medium">Prescriptions</span>
                    </button>
                    <button
                      onClick={() => setActiveView('calendar')}
                      disabled={prescriptions.length === 0}
                      className={`flex-1 flex flex-col items-center justify-center py-3 px-4 transition-colors ${
                        activeView === 'calendar'
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      } ${prescriptions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium">Calendar</span>
                    </button>
                  </div>
                </div>,
                document.body
              )
            )}
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

