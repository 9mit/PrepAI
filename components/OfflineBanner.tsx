import React, { useEffect, useState } from 'react';

const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOff = () => setOffline(true);
    const goOn = () => setOffline(false);
    window.addEventListener('offline', goOff);
    window.addEventListener('online', goOn);
    return () => {
      window.removeEventListener('offline', goOff);
      window.removeEventListener('online', goOn);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[60] bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-amber-200"
    >
      You are offline — interview history stays on this device; cloud AI features need a connection.
    </div>
  );
};

export default OfflineBanner;
