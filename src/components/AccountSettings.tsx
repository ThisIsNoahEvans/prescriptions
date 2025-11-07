import { useState, useEffect, useCallback, useRef } from 'react';
import { User, MultiFactorInfo } from 'firebase/auth';
import { TotpSecret } from 'firebase/auth';
import {
  hasMFA,
  getMFAFactors,
  startTotpMFAEnrollment,
  completeTotpMFAEnrollment,
  unenrollMFA,
  sendVerificationEmail,
  linkGoogleProvider,
  unlinkProvider,
  deleteAccount,
  signOutAuth,
} from '../services/authService';
import { deleteAllUserData } from '../services/userDataService';
import { ReauthenticateModal } from './ReauthenticateModal';
import { LinkProviderModal } from './LinkProviderModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { DeleteMFAConfirmationModal } from './DeleteMFAConfirmationModal';
import { UnlinkProviderModal } from './UnlinkProviderModal';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface AccountSettingsProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onAccountDeleted: () => void;
}

export function AccountSettings({
  user,
  isOpen,
  onClose,
  onError,
  onSuccess,
  onAccountDeleted,
}: AccountSettingsProps) {
  // MFA states
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [factors, setFactors] = useState<MultiFactorInfo[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showDeleteMFAModal, setShowDeleteMFAModal] = useState(false);
  const [mfaFactorToDelete, setMfaFactorToDelete] = useState<string | null>(null);

  // Provider linking states
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);
  const [showLinkEmailModal, setShowLinkEmailModal] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showUnlinkProviderModal, setShowUnlinkProviderModal] = useState(false);
  const [providerToUnlink, setProviderToUnlink] = useState<{ id: string; name: string } | null>(null);

  // Account deletion states
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Modal states
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const scrollLockedRef = useRef(false);

  // Get provider info
  const isGoogleUser = user.providerData.some((provider) => provider.providerId === 'google.com');
  const isEmailUser = user.providerData.some((provider) => provider.providerId === 'password');
  const hasMultipleProviders = user.providerData.length > 1;

  const updateMFAStatus = useCallback(() => {
    const enabled = hasMFA(user);
    setMfaEnabled(enabled);
    if (enabled) {
      setFactors(getMFAFactors(user));
    }
  }, [user]);

  useEffect(() => {
    updateMFAStatus();
  }, [updateMFAStatus]);

  // Modal animation and body scroll lock
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(false);
      if (!scrollLockedRef.current) {
        lockBodyScroll();
        scrollLockedRef.current = true;
      }
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      if (scrollLockedRef.current) {
        unlockBodyScroll();
        scrollLockedRef.current = false;
      }
    }

    return () => {
      if (scrollLockedRef.current) {
        unlockBodyScroll();
        scrollLockedRef.current = false;
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setIsVisible(false);
    if (scrollLockedRef.current) {
      unlockBodyScroll();
      scrollLockedRef.current = false;
    }
    setTimeout(() => {
      if (scrollLockedRef.current) {
        unlockBodyScroll();
        scrollLockedRef.current = false;
      }
      onClose();
    }, 300);
  };

  if (!isOpen && !isClosing) {
    return null;
  }

  // MFA handlers
  const handleStartEnrollment = async () => {
    if (!user.emailVerified) {
      onError('Please verify your email address before enabling 2FA. Check your inbox for the verification email.');
      return;
    }

    setIsEnrolling(true);
    try {
      const result = await startTotpMFAEnrollment(user);
      setTotpSecret(result.secret);

      try {
        const QRCodeModule = await import('qrcode');
        const qrDataUrl = await QRCodeModule.default.toDataURL(result.qrCodeUrl, {
          width: 256,
          margin: 2,
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        onError('Error generating QR code. Please try again.');
        setIsEnrolling(false);
      }
    } catch (error: unknown) {
      console.error('Error starting MFA enrollment:', error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/unverified-email') {
        onError('Please verify your email address before enabling 2FA. Check your inbox for the verification email.');
        setIsEnrolling(false);
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        setPendingAction(async () => {
          const result = await startTotpMFAEnrollment(user);
          setTotpSecret(result.secret);
          const QRCodeModule = await import('qrcode');
          const qrDataUrl = await QRCodeModule.default.toDataURL(result.qrCodeUrl, {
            width: 256,
            margin: 2,
          });
          setQrCodeDataUrl(qrDataUrl);
        });
        setShowReauthModal(true);
        setIsEnrolling(false);
      } else {
        onError('Error starting MFA enrollment. Please try again.');
        setIsEnrolling(false);
      }
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      await sendVerificationEmail(user);
      onSuccess('Verification email sent! Please check your inbox and verify your email before enabling 2FA.');
    } catch (error: unknown) {
      console.error('Error resending verification email:', error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/too-many-requests') {
        onError('Too many requests. Please wait a few minutes before requesting another verification email.');
      } else {
        onError('Error sending verification email. Please try again.');
      }
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleCompleteEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      onError('Please enter a valid 6-digit verification code.');
      return;
    }

    if (!totpSecret) {
      onError('TOTP secret not available. Please start enrollment again.');
      return;
    }

    setIsVerifying(true);
    try {
      await completeTotpMFAEnrollment(user, totpSecret, verificationCode);
      onSuccess('MFA enabled successfully!');
      setTotpSecret(null);
      setVerificationCode('');
      setIsEnrolling(false);
      updateMFAStatus();
    } catch (error: unknown) {
      console.error('Error completing MFA enrollment:', error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/invalid-verification-code') {
        onError('Invalid verification code. Please try again.');
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        if (!totpSecret) {
          onError('TOTP secret not available. Please start enrollment again.');
          setIsVerifying(false);
          return;
        }
        const secretToUse = totpSecret;
        setPendingAction(async () => {
          await completeTotpMFAEnrollment(user, secretToUse, verificationCode);
          onSuccess('MFA enabled successfully!');
          setTotpSecret(null);
          setVerificationCode('');
          setIsEnrolling(false);
          updateMFAStatus();
        });
        setShowReauthModal(true);
      } else {
        onError('Error completing MFA enrollment. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnenroll = (factorUid: string) => {
    setMfaFactorToDelete(factorUid);
    setShowDeleteMFAModal(true);
  };

  const handleConfirmUnenroll = async (factorUid: string) => {
    try {
      await unenrollMFA(user, factorUid);
      onSuccess('MFA disabled successfully.');
      updateMFAStatus();
      setShowDeleteMFAModal(false);
      setMfaFactorToDelete(null);
    } catch (error: unknown) {
      console.error('Error unenrolling MFA:', error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/requires-recent-login') {
        setPendingAction(async () => {
          await unenrollMFA(user, factorUid);
          onSuccess('MFA disabled successfully.');
          updateMFAStatus();
        });
        setShowReauthModal(true);
        setShowDeleteMFAModal(false);
        setMfaFactorToDelete(null);
      } else {
        onError('Error disabling MFA. Please try again.');
      }
    }
  };

  const handleReauthSuccess = async () => {
    if (pendingAction) {
      try {
        await pendingAction();
        setPendingAction(null);
      } catch (error: unknown) {
        console.error('Error retrying action after re-authentication:', error);
        onError('Error completing action. Please try again.');
      }
    }
  };

  // Provider linking handlers
  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      await linkGoogleProvider(user);
      onSuccess('Google account linked successfully!');
    } catch (error: any) {
      console.error('Error linking Google:', error);
      if (error.code === 'auth/provider-already-linked') {
        onError('Google account is already linked to this account.');
      } else if (error.code === 'auth/credential-already-in-use') {
        onError('This Google account is already associated with another account.');
      } else {
        onError('Error linking Google account. Please try again.');
      }
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleLinkEmail = () => {
    setShowLinkEmailModal(true);
  };

  const handleLinkEmailSuccess = (message: string) => {
    onSuccess(message);
    setShowLinkEmailModal(false);
    setIsLinkingEmail(false);
    // Reload user to get updated provider data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleUnlinkProvider = (providerId: string, providerName: string) => {
    if (!hasMultipleProviders) {
      onError('Cannot unlink the only sign-in method. Please add another sign-in method first.');
      return;
    }

    setProviderToUnlink({ id: providerId, name: providerName });
    setShowUnlinkProviderModal(true);
  };

  const handleConfirmUnlinkProvider = async (providerId: string) => {
    setIsUnlinking(true);
    try {
      await unlinkProvider(user, providerId);
      onSuccess('Sign-in method unlinked successfully.');
      setShowUnlinkProviderModal(false);
      setProviderToUnlink(null);
      // Reload user to get updated provider data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error unlinking provider:', error);
      if (error.code === 'auth/no-such-provider') {
        onError('This sign-in method is not linked to your account.');
      } else {
        onError('Error unlinking sign-in method. Please try again.');
      }
      setIsUnlinking(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAllUserData(user.uid);
      await deleteAccount(user);
      await signOutAuth();
      onAccountDeleted();
      onSuccess('Account deleted successfully.');
    } catch (error) {
      console.error('Error deleting account:', error);
      onError('Error deleting account. Please try again.');
    }
  };

  // Render MFA enrollment view
  if (isEnrolling && totpSecret) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`bg-white dark:bg-gray-800 w-full max-w-lg p-6 rounded-xl shadow-2xl transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto ${
            isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enable Two-Factor Authentication
            </h3>
            <button
              onClick={() => {
                setIsEnrolling(false);
                setTotpSecret(null);
                setQrCodeDataUrl('');
                setVerificationCode('');
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scan this QR code with an authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="flex justify-center mb-4">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="TOTP QR Code" className="border border-gray-300 dark:border-gray-600 rounded-lg" />
              ) : (
                <div className="w-64 h-64 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Generating QR code...</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
              Or enter this secret key manually:
            </p>
            <code className="block p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm break-all">
              {(() => {
                const secretObj = totpSecret as unknown as { secret?: string; secretKey?: string; sharedSecretKey?: string };
                const secret = secretObj.secret || secretObj.secretKey || secretObj.sharedSecretKey;
                return secret || 'Secret key not available';
              })()}
            </code>
          </div>

          <form onSubmit={handleCompleteEnrollment}>
            <div className="mb-4">
              <label
                htmlFor="verification-code"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Enter 6-digit code from your authenticator app
              </label>
              <input
                type="text"
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
                placeholder="000000"
                disabled={isVerifying}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isVerifying || verificationCode.length !== 6}
                className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEnrolling(false);
                  setTotpSecret(null);
                  setQrCodeDataUrl('');
                  setVerificationCode('');
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget && isVisible) {
            handleClose();
          }
        }}
      >
        <div
          className={`bg-white dark:bg-gray-800 w-full max-w-3xl p-6 rounded-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto ${
            isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Account Settings</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Account Info */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Account Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-base text-gray-900 dark:text-white">{user.email || 'No email'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Verified</p>
                  <p className={`text-base ${user.emailVerified ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {user.emailVerified ? '✓ Verified' : '✗ Not Verified'}
                  </p>
                </div>
                {!user.emailVerified && (
                  <button
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {isResendingVerification ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            </div>

            {/* Sign-In Methods */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sign-In Methods</h3>
              <div className="space-y-3">
                {isGoogleUser && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Google</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sign in with Google</p>
                      </div>
                    </div>
                    {hasMultipleProviders && (
                      <button
                        onClick={() => handleUnlinkProvider('google.com', 'Google')}
                        disabled={isUnlinking}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                      >
                        Unlink
                      </button>
                    )}
                  </div>
                )}

                {isEmailUser && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Email/Password</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sign in with email and password</p>
                      </div>
                    </div>
                    {hasMultipleProviders && (
                      <button
                        onClick={() => handleUnlinkProvider('password', 'Email/Password')}
                        disabled={isUnlinking}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                      >
                        Unlink
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {!isGoogleUser && (
                    <button
                      onClick={handleLinkGoogle}
                      disabled={isLinkingGoogle}
                      className="flex-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {isLinkingGoogle ? 'Linking...' : 'Link Google'}
                    </button>
                  )}
                  {!isEmailUser && (
                    <button
                      onClick={handleLinkEmail}
                      disabled={isLinkingEmail}
                      className="flex-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {isLinkingEmail ? 'Linking...' : 'Link Email/Password'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Two-Factor Authentication (2FA)</h3>
              {mfaEnabled ? (
                <div>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      <strong>✓ MFA is enabled</strong>
                    </p>
                    <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                      Your account is protected with two-factor authentication (TOTP).
                    </p>
                  </div>

                  <div className="space-y-3">
                    {factors.map((factor) => (
                      <div
                        key={factor.uid}
                        className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {factor.displayName || 'TOTP Authenticator'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Authenticator App (TOTP)
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnenroll(factor.uid)}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {!user.emailVerified ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                      <p className="text-red-800 dark:text-red-200 text-sm mb-2">
                        <strong>Email verification required</strong>
                      </p>
                      <p className="text-red-700 dark:text-red-300 text-xs mb-3">
                        You must verify your email address before enabling two-factor authentication. Please check your inbox for the verification email.
                      </p>
                      <button
                        onClick={handleResendVerification}
                        disabled={isResendingVerification}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        {isResendingVerification ? 'Sending...' : 'Resend verification email'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                        <strong>MFA is not enabled</strong>
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                        Enable two-factor authentication using an authenticator app (TOTP) to add an extra layer of security to your account.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleStartEnrollment}
                    disabled={isEnrolling || !user.emailVerified}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEnrolling ? 'Setting up...' : 'Enable MFA'}
                  </button>
                </div>
              )}
            </div>

            {/* Delete Account */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Danger Zone</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteAccountModal(true)}
                className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReauthenticateModal
        user={user}
        isOpen={showReauthModal}
        onClose={() => {
          setShowReauthModal(false);
          setPendingAction(null);
        }}
        onSuccess={handleReauthSuccess}
        onError={onError}
      />

      <LinkProviderModal
        user={user}
        isOpen={showLinkEmailModal}
        onClose={() => {
          setShowLinkEmailModal(false);
          setIsLinkingEmail(false);
        }}
        onSuccess={handleLinkEmailSuccess}
        onError={onError}
      />

      <DeleteAccountModal
        user={user}
        isOpen={showDeleteAccountModal}
        onClose={() => {
          setShowDeleteAccountModal(false);
        }}
        onConfirm={handleDeleteAccount}
        onError={onError}
      />

      {mfaFactorToDelete && (
        <DeleteMFAConfirmationModal
          isOpen={showDeleteMFAModal}
          onClose={() => {
            setShowDeleteMFAModal(false);
            setMfaFactorToDelete(null);
          }}
          onConfirm={async () => {
            if (mfaFactorToDelete) {
              await handleConfirmUnenroll(mfaFactorToDelete);
            }
          }}
          onError={onError}
        />
      )}

      {providerToUnlink && (
        <UnlinkProviderModal
          providerName={providerToUnlink.name}
          isOpen={showUnlinkProviderModal}
          onClose={() => {
            setShowUnlinkProviderModal(false);
            setProviderToUnlink(null);
          }}
          onConfirm={async () => {
            if (providerToUnlink) {
              await handleConfirmUnlinkProvider(providerToUnlink.id);
            }
          }}
          onError={onError}
        />
      )}
    </>
  );
}

