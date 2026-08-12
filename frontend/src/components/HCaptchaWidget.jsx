import { useEffect, useRef } from 'react';

const SCRIPT_ID = 'hcaptcha-api-script';

const loadHCaptcha = () => new Promise((resolve, reject) => {
  if (window.hcaptcha) {
    resolve(window.hcaptcha);
    return;
  }

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    existing.addEventListener('load', () => resolve(window.hcaptcha), { once: true });
    existing.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
  script.async = true;
  script.defer = true;
  script.onload = () => resolve(window.hcaptcha);
  script.onerror = reject;
  document.head.appendChild(script);
});

const HCaptchaWidget = ({ sitekey, onVerify, onExpire, onError }) => {
  const containerRef = useRef(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  callbacksRef.current = { onVerify, onExpire, onError };

  useEffect(() => {
    let active = true;
    let widgetId;

    loadHCaptcha()
      .then((hcaptcha) => {
        if (!active || !containerRef.current) return;
        widgetId = hcaptcha.render(containerRef.current, {
          sitekey,
          callback: (token) => callbacksRef.current.onVerify(token),
          'expired-callback': () => callbacksRef.current.onExpire(),
          'error-callback': () => callbacksRef.current.onError(),
        });
      })
      .catch(() => callbacksRef.current.onError());

    return () => {
      active = false;
      if (widgetId !== undefined && window.hcaptcha) window.hcaptcha.remove(widgetId);
    };
  }, [sitekey]);

  return <div ref={containerRef} />;
};

export default HCaptchaWidget;
