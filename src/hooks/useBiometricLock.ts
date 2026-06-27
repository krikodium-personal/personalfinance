import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'pekri_biometric_v1';

interface Stored {
  enabled: boolean;
  credentialId: string | null;
}

function getStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, credentialId: null };
    return JSON.parse(raw) as Stored;
  } catch {
    return { enabled: false, credentialId: null };
  }
}

function setStored(data: Stored) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function randomBytes(n: number): ArrayBuffer {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr.buffer as ArrayBuffer;
}

function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64decode(s: string): ArrayBuffer {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer as ArrayBuffer;
}

export function useBiometricLock(isAuthenticated: boolean) {
  const [isLocked, setIsLocked] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || checked.current) return;
    checked.current = true;

    if (!window.PublicKeyCredential) {
      setIsAvailable(false);
      return;
    }

    void PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
      setIsAvailable(available);
      const stored = getStored();
      setIsEnabled(stored.enabled);
      if (available && stored.enabled && stored.credentialId) {
        setIsLocked(true);
      }
    }).catch(() => setIsAvailable(false));
  }, [isAuthenticated]);

  const unlock = async (): Promise<boolean> => {
    const stored = getStored();
    if (!stored.credentialId) return false;
    try {
      const cred = await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          rpId: window.location.hostname,
          allowCredentials: [{
            type: 'public-key',
            id: b64decode(stored.credentialId),
            transports: ['internal'],
          }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (cred) { setIsLocked(false); return true; }
      return false;
    } catch {
      return false;
    }
  };

  const enable = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: { id: window.location.hostname, name: 'Pekri Finanzas' },
          user: { id: randomBytes(16), name: 'pekri-user', displayName: 'Usuario' },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;
      if (!cred) return { ok: false, error: 'No se pudo registrar el biométrico.' };
      setStored({ enabled: true, credentialId: b64encode(cred.rawId) });
      setIsEnabled(true);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('cancel') || msg.includes('abort') || msg.includes('NotAllowed')) {
        return { ok: false, error: 'Cancelado.' };
      }
      return { ok: false, error: 'No se pudo activar el biométrico.' };
    }
  };

  const disable = () => {
    setStored({ enabled: false, credentialId: null });
    setIsEnabled(false);
    setIsLocked(false);
  };

  return { isLocked, isAvailable, isEnabled, unlock, enable, disable };
}
