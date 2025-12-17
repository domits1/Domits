import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import QRCode from "react-qr-code";
import styles from "./HostDashboard.module.scss";
import "./HostHomepage.scss";

function HostSecurity() {
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
        console.log("Preferred MFA:", preferred);

        if (preferred === "SOFTWARE_TOKEN_MFA" || preferred === "TOTP") {
          setMfaEnabled(true);
        } else {
          setMfaEnabled(false);
        }
      } catch (err) {
        console.error("Error checking MFA:", err);
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
      )}?secret=${secret}&issuer=${encodeURIComponent(
        appName
      )}&algorithm=SHA1&digits=6&period=30`;

      setMfaSetupUri(uri);
      setMfaSetupMode(true);
    } catch (err) {
      console.error("Error starting MFA setup:", err);
      setMfaSetupError("Could not start MFA setup. Please try again later.");
    }
  };

  const handleConfirmMfaSetup = async () => {
    setMfaSetupError("");
    setMfaMessage("");

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
      console.error("Error confirming MFA setup:", err);
      setMfaSetupError("Invalid code. Please try again.");
    }
  };

  return (
    <main className="page-Host">
      <p className="page-Host-title">Security</p>

      <div className="page-Host-content">
        <section className="host-pc-dashboard">
          <div className={styles.dashboardContainer}>
            <div className={styles.dashboardLeft}>
              <div className={styles.topRow}>
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
                        onClick={() =>
                          setMfaMessage("You already have MFA enabled.")
                        }
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
              </div>

              {mfaSetupMode && (
                <div className={styles.mfaSetupBox}>
                  <h3>Enable two-factor authentication</h3>
                  <p>
                    1. Scan this QR code with Google Authenticator or a similar
                    app.
                  </p>

                  {mfaSetupUri && (
                    <div className={styles.qrContainer}>
                      <QRCode value={mfaSetupUri} />
                    </div>
                  )}

                  <p>2. Enter the 6-digit code from your authenticator app:</p>
                  <input
                    className={styles.mfaInput || "loginInput"}
                    type="text"
                    maxLength={6}
                    value={mfaSetupCode}
                    onChange={(e) => setMfaSetupCode(e.target.value)}
                  />

                  {mfaSetupError && (
                    <div className={styles.errorText || "errorText"}>
                      {mfaSetupError}
                    </div>
                  )}

                  <div className={styles.mfaButtons}>
                    <button
                      className={styles.greenBtn}
                      type="button"
                      onClick={handleConfirmMfaSetup}
                    >
                      Verify & enable MFA
                    </button>
                    <button
                      className={styles.secondaryBtn || styles.greenBtn}
                      type="button"
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

              {!mfaSetupMode && (
                <div className={styles.infoBox}>
                  <p>
                    We strongly recommend enabling two-factor authentication to
                    protect your account and payouts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HostSecurity;
