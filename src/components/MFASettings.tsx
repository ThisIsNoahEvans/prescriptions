import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  hasMFA,
  getMFAFactors,
  startTotpMFAEnrollment,
  completeTotpMFAEnrollment,
  unenrollMFA,
  sendVerificationEmail,
} from '../services/authService';
import { ReauthenticateModal } from './ReauthenticateModal';
import QRCode from 'qrcode';

interface MFASettingsProps {
  user: User;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function MFASettings({ user, onError, onSuccess }: MFASettingsProps) {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [totpSecret, setTotpSecret] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    updateMFAStatus();
  }, [user]);

  const updateMFAStatus = () => {
    const enabled = hasMFA(user);
    setMfaEnabled(enabled);
    if (enabled) {
      setFactors(getMFAFactors(user));
    }
  };

  const handleStartEnrollment = async () => {
    // Check if email is verified first
    if (!user.emailVerified) {
      onError('Please verify your email address before enabling 2FA. Check your inbox for the verification email.');
      return;
    }

    setIsEnrolling(true);
    try {
      const result = await startTotpMFAEnrollment(user);
      setTotpSecret(result.secret);
      setQrCodeUrl(result.qrCodeUrl);
      
      // Generate QR code image from the otpauth URL
      try {
        const qrDataUrl = await QRCode.toDataURL(result.qrCodeUrl, {
          width: 256,
          margin: 2,
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        onError('Error generating QR code. Please try again.');
        setIsEnrolling(false);
      }
    } catch (error: any) {
      console.error('Error starting MFA enrollment:', error);
      if (error.code === 'auth/unverified-email') {
        onError('Please verify your email address before enabling 2FA. Check your inbox for the verification email.');
        setIsEnrolling(false);
      } else if (error.code === 'auth/requires-recent-login') {
        // Store the action to retry after re-authentication
        setPendingAction(async () => {
          const result = await startTotpMFAEnrollment(user);
          setTotpSecret(result.secret);
          setQrCodeUrl(result.qrCodeUrl);
          // Generate QR code image
          const qrDataUrl = await QRCode.toDataURL(result.qrCodeUrl, {
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
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      if (error.code === 'auth/too-many-requests') {
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

    setIsVerifying(true);
    try {
      await completeTotpMFAEnrollment(user, totpSecret, verificationCode);
      onSuccess('MFA enabled successfully!');
      setTotpSecret(null);
      setQrCodeUrl('');
      setVerificationCode('');
      setIsEnrolling(false);
      updateMFAStatus();
    } catch (error: any) {
      console.error('Error completing MFA enrollment:', error);
      if (error.code === 'auth/invalid-verification-code') {
        onError('Invalid verification code. Please try again.');
      } else if (error.code === 'auth/requires-recent-login') {
        // Store the action to retry after re-authentication
        setPendingAction(async () => {
          await completeTotpMFAEnrollment(user, totpSecret, verificationCode);
          onSuccess('MFA enabled successfully!');
          setTotpSecret(null);
          setQrCodeUrl('');
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

  const handleUnenroll = async (factorUid: string) => {
    if (!window.confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return;
    }

    try {
      await unenrollMFA(user, factorUid);
      onSuccess('MFA disabled successfully.');
      updateMFAStatus();
    } catch (error: any) {
      console.error('Error unenrolling MFA:', error);
      if (error.code === 'auth/requires-recent-login') {
        // Store the action to retry after re-authentication
        setPendingAction(async () => {
          await unenrollMFA(user, factorUid);
          onSuccess('MFA disabled successfully.');
          updateMFAStatus();
        });
        setShowReauthModal(true);
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
      } catch (error: any) {
        console.error('Error retrying action after re-authentication:', error);
        onError('Error completing action. Please try again.');
      }
    }
  };

  if (isEnrolling && totpSecret) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Enable Two-Factor Authentication
        </h3>
        
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
              // Try to access the secret key from the TotpSecret object
              const secret = (totpSecret as any).secret || (totpSecret as any).secretKey || (totpSecret as any).sharedSecretKey;
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
                setQrCodeUrl('');
                setVerificationCode('');
              }}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Two-Factor Authentication (2FA)
      </h3>

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
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
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
    </div>
  );
}

