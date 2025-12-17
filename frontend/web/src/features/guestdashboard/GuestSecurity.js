// src/pages/guestdashboard/GuestSecurity.js
import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import QRCode from "react-qr-code";
import styles from "../hostdashboard/HostDashboard.module.scss";

function GuestSecurity() {
  const [mfaSetupMode, setMfaSetupMode] = useState(false);
  const [mfaSetupUri, setMfaSetupUri] = useState("");
  const [mfaSetupCode, setMfaSetupCode] = useState("");
  const [mfaSetupError, setMfaSetupError] = useState("");

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(true);
  const [mfaMessage, setMfaMessage] = useState("");

  useEffect(() => {
    const checkMfa = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser({ bypassCache: true });
        const preferred = await Auth.getPreferredMFA(user);

        if (preferred === "TOTP" || preferred === "SOFTWARE_TOKEN_MFA") {
          setMfaEnabled(true);
        }
      } catch (err) {
        console.error("Error checking guest MFA:", err);
      } finally {
        setCheckingMfa(false);
      }
    };

    checkMfa();
  }, []);

  const handleStartMfaSetup = async () => {
    setMfaSetupError("");
    setMfaMessage("");

    if (mfaEnabled) {
      setMfaMessage("You already have MFA enabled.");
      return;
    }

    try {
      const user = await Auth.currentAuthenticatedUser();
      const secret = await Auth.setupTOTP(user);

      const appName = "Domits";
      const username = user.username;

      const uri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(
        username
      )}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;

      setMfaSetupUri(uri);
      setMfaSetupMode(true);
    } catch (err) {
      console.error("Error starting guest MFA setup:", err);
      setMfaSetupError("Could not start MFA setup. Please try again.");
    }
  };

  const handleConfirmMfaSetup = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.verifyTotpToken(user, mfaSetupCode);
      await Auth.setPreferredMFA(user, "TOTP");

      setMfaEnabled(true);
      setMfaMessage("MFA has been enabled successfully!");
      setMfaSetupMode(false);
      setMfaSetupUri("");
      setMfaSetupCode("");
    } catch (err) {
      console.error("Error confirming guest MFA setup:", err);
      setMfaSetupError("Invalid code. Please try again.");
    }
  };

  return (
    <main className="page-GuestSecurity">
      <h1 className="page-title">Security</h1>

      <section className="security-section">
        <div className={styles.leftHeader}>
          <h3 className={styles.welcomeMsg}>Account security</h3>

          {mfaMessage && (
            <div className={styles.infoBox}>
              <p>{mfaMessage}</p>
            </div>
          )}

          <div className={styles.buttonBox}>
            {checkingMfa ? (
              <button className={styles.greenBtn} disabled>
                Checking MFA…
              </button>
            ) : mfaEnabled ? (
              <button
                className={styles.greenBtn}
                type="button"
                onClick={() => setMfaMessage("You already have MFA enabled.")}
              >
                MFA enabled ✓
              </button>
            ) : (
              <button
                className={styles.greenBtn}
                type="button"
                onClick={handleStartMfaSetup}
              >
                Enable MFA 
              </button>
            )}
          </div>
        </div>

        {mfaSetupMode && (
          <div className={styles.mfaSetupBox}>
            <h3>Enable two-factor authentication</h3>

            {mfaSetupUri && (
              <div className={styles.qrContainer}>
                <QRCode value={mfaSetupUri} />
              </div>
            )}

            <p>Enter the 6-digit code from your authenticator app:</p>

            <input
              className={styles.mfaInput}
              type="text"
              maxLength={6}
              value={mfaSetupCode}
              onChange={(e) =>
                setMfaSetupCode(e.target.value.replace(/\D/g, ""))
              }
            />

            {mfaSetupError && (
              <p className={styles.errorText}>{mfaSetupError}</p>
            )}

            <div className={styles.mfaButtons}>
              <button className={styles.greenBtn} onClick={handleConfirmMfaSetup}>
                Verify & enable MFA
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setMfaSetupMode(false);
                  setMfaSetupUri("");
                  setMfaSetupCode("");
                  setMfaSetupError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default GuestSecurity;
