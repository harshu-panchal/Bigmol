import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ensureFcmToken,
  startForegroundMessageListener,
} from '../firebase/messaging';

const FcmManager = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe = () => {};
    let unmounted = false;

    const boot = async () => {
      try {
        // If permission already granted, save immediately (no prompt).
        await ensureFcmToken({ forcePrompt: false });
        if (unmounted) return;
        unsubscribe = await startForegroundMessageListener(
          (link) => navigate(link),
          ({ title, body, link }) => {
            const message = title + (body ? `: ${body}` : '');
            toast(message, {
              duration: 4500,
              ...(link
                ? {
                    onClick: () => navigate(link),
                  }
                : {}),
            });
          }
        );
      } catch {
        // no-op to preserve UX
      }
    };

    boot();

    return () => {
      unmounted = true;
      unsubscribe?.();
    };
  }, [navigate]);

  useEffect(() => {
    const showEnableToast = () => {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'default') return;

      toast((t) => (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="font-semibold">Enable notifications?</div>
            <div className="opacity-80">Get order and account updates instantly.</div>
          </div>
          <button
            className="ml-auto rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={() => {
              toast.dismiss(t.id);
              ensureFcmToken({ forcePrompt: true }).catch(() => {});
            }}
            type="button"
          >
            Enable
          </button>
        </div>
      ), { duration: 10000 });
    };

    const onPromptRequest = () => showEnableToast();

    // Called explicitly after successful login/verify to guarantee a real user click.
    window.addEventListener('fcm:prompt', onPromptRequest);

    // Backward compatible fallback: first user click after app load.
    window.addEventListener('click', showEnableToast, { once: true });

    return () => {
      window.removeEventListener('fcm:prompt', onPromptRequest);
      window.removeEventListener('click', showEnableToast);
    };
  }, []);

  return null;
};

export default FcmManager;
