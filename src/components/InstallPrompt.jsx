import { useEffect, useState } from "react";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isMobile() {
  return (
    window.matchMedia("(max-width: 820px)").matches ||
    /android|iphone|ipad|ipod/i.test(window.navigator.userAgent)
  );
}

function wasDismissed() {
  return window.sessionStorage.getItem("linhgiang:install-dismissed") === "1";
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isMobile() || wasDismissed()) {
      return undefined;
    }

    if (isIOS()) {
      setShowIOS(true);
      return undefined;
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    window.sessionStorage.setItem("linhgiang:install-dismissed", "1");
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOS(false);
  }

  async function install() {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      dismiss();
      return;
    }

    setDeferredPrompt(null);
  }

  if (dismissed || (!deferredPrompt && !showIOS)) {
    return null;
  }

  return (
    <aside className="install-prompt" aria-label="Install app">
      <img src="/icon.svg" alt="" />
      <div>
        <strong>Install Linhgiang</strong>
        <span>{showIOS ? "Add to Home Screen from Share" : "Open from your home screen"}</span>
      </div>
      {deferredPrompt && (
        <button type="button" className="primary-button" onClick={install}>
          Install
        </button>
      )}
      <button type="button" className="install-dismiss" onClick={dismiss} aria-label="Dismiss">
        &times;
      </button>
    </aside>
  );
}
