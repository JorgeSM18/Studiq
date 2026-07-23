import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Whether the biometric app-lock is on. Stored on the device (SecureStore), not
// the backend: "unlock with Face ID" is a per-device choice, not synced state.
const LOCK_KEY = 'biometric_lock_enabled';

/** True only if the device has biometric hardware AND the user has enrolled one. */
export async function biometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

/** Prompts fingerprint/Face ID (falling back to the device passcode). */
export async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    // Let the OS offer the device PIN/pattern if biometrics fail, so a user who
    // just wiped a fingerprint isn't locked out of their own session.
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function isLockEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(LOCK_KEY)) === '1';
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(LOCK_KEY, '1');
  else await SecureStore.deleteItemAsync(LOCK_KEY);
}
