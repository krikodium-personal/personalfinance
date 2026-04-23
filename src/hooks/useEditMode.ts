import { useEffect } from 'react';

export function useEditMode(onActivate: () => void, onDeactivate: () => void) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === '__activate_edit_mode') onActivate();
      if (event.data?.type === '__deactivate_edit_mode') onDeactivate();
    };

    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');

    return () => window.removeEventListener('message', handler);
  }, [onActivate, onDeactivate]);
}
