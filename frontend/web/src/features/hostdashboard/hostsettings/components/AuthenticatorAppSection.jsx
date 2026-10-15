import React, { useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { authStatusShape } from "../../../../components/settings/propTypes";

const CODE_LENGTH = 6;

const groupSecretKey = (secretKey) => secretKey.match(/.{1,4}/g)?.join(" ") ?? "";

const toDigits = (value) => value.replace(/\D/g, "").slice(0, CODE_LENGTH);

function getStatusPill(authStatus, isUnavailable, labels) {
    if (isUnavailable) {
        return { text: labels.unavailable, modifier: "inactive" };
    }
    if (authStatus.preferredMFA === "TOTP") {
        return { text: labels.active, modifier: "active" };
    }
    return { text: labels.inactive, modifier: "inactive" };
}

const ErrorText = ({ id, text }) => (
    <p id={id} className="pd-field-error pd-authenticator-error" role="alert">
        {text}
    </p>
);

ErrorText.propTypes = {
    id: PropTypes.string,
    text: PropTypes.string.isRequired,
};

const SetupPanel = ({ t, qrCodeUrl, secretKey, isSubmitting, errorText, onVerify, onCancel }) => {
    const [code, setCode] = useState("");
    const codeInputId = useId();
    const errorId = useId();
    const codeInputRef = useRef(null);

    useEffect(() => {
        codeInputRef.current?.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onVerify(code);
    };

    return (
        <form className="pd-password-inline" onSubmit={handleSubmit}>
            <p className="pd-password-inline-title">{t.setupTitle}</p>
            <p className="pd-authenticator-text">{t.scanInstruction}</p>
            <img className="pd-authenticator-qr" src={qrCodeUrl} alt={t.qrAlt} />

            <div className="pd-authenticator-manual">
                <p className="pd-authenticator-text">{t.manualKeyLabel}</p>
                <code className="pd-authenticator-key">{groupSecretKey(secretKey)}</code>
            </div>

            <div className="pd-field">
                <label className="pd-field-label" htmlFor={codeInputId}>
                    {t.codeLabel}
                </label>
                <input
                    ref={codeInputRef}
                    id={codeInputId}
                    type="text"
                    className="pd-field-input pd-authenticator-code-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={CODE_LENGTH}
                    value={code}
                    onChange={(e) => setCode(toDigits(e.target.value))}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errorText)}
                    aria-describedby={errorText ? errorId : undefined}
                />
            </div>

            {errorText && <ErrorText id={errorId} text={errorText} />}

            <div className="pd-authenticator-actions">
                <button type="button" className="pd-authenticator-secondary-btn" onClick={onCancel} disabled={isSubmitting}>
                    {t.cancel}
                </button>
                <button type="submit" className="pd-save-btn" disabled={isSubmitting}>
                    {isSubmitting ? t.verifying : t.verify}
                </button>
            </div>
        </form>
    );
};

SetupPanel.propTypes = {
    t: PropTypes.object.isRequired,
    qrCodeUrl: PropTypes.string.isRequired,
    secretKey: PropTypes.string.isRequired,
    isSubmitting: PropTypes.bool.isRequired,
    errorText: PropTypes.string,
    onVerify: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

const EnablePendingPanel = ({ t, isSubmitting, errorText, onRetry, onCancel }) => {
    const retryButtonRef = useRef(null);

    useEffect(() => {
        if (!isSubmitting) {
            retryButtonRef.current?.focus();
        }
    }, [isSubmitting]);

    return (
        <div className="pd-password-inline">
            {errorText && <ErrorText text={errorText} />}
            <div className="pd-authenticator-actions">
                <button type="button" className="pd-authenticator-secondary-btn" onClick={onCancel} disabled={isSubmitting}>
                    {t.cancel}
                </button>
                <button ref={retryButtonRef} type="button" className="pd-save-btn" onClick={onRetry} disabled={isSubmitting}>
                    {isSubmitting ? t.verifying : t.tryAgain}
                </button>
            </div>
        </div>
    );
};

EnablePendingPanel.propTypes = {
    t: PropTypes.object.isRequired,
    isSubmitting: PropTypes.bool.isRequired,
    errorText: PropTypes.string,
    onRetry: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

const DonePanel = ({ message, closeLabel, onClose }) => {
    const closeButtonRef = useRef(null);

    useEffect(() => {
        closeButtonRef.current?.focus();
    }, []);

    return (
        <div className="pd-password-inline">
            <output className="pd-password-success pd-authenticator-success">{message}</output>
            <div className="pd-authenticator-actions">
                <button ref={closeButtonRef} type="button" className="pd-save-btn" onClick={onClose}>
                    {closeLabel}
                </button>
            </div>
        </div>
    );
};

DonePanel.propTypes = {
    message: PropTypes.string.isRequired,
    closeLabel: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
};

const DisableConfirmPanel = ({ t, isSubmitting, errorText, onConfirm, onCancel }) => {
    const cancelButtonRef = useRef(null);

    useEffect(() => {
        cancelButtonRef.current?.focus();
    }, []);

    return (
        <div className="pd-password-inline">
            <p className="pd-password-inline-title">{t.disableTitle}</p>
            <p className="pd-authenticator-text">{t.disableWarning}</p>
            {errorText && <ErrorText text={errorText} />}
            <div className="pd-authenticator-actions">
                <button
                    ref={cancelButtonRef}
                    type="button"
                    className="pd-authenticator-secondary-btn"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    {t.cancel}
                </button>
                <button
                    type="button"
                    className="pd-save-btn pd-authenticator-danger-btn"
                    onClick={onConfirm}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? t.turningOff : t.confirmTurnOff}
                </button>
            </div>
        </div>
    );
};

DisableConfirmPanel.propTypes = {
    t: PropTypes.object.isRequired,
    isSubmitting: PropTypes.bool.isRequired,
    errorText: PropTypes.string,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

const AuthenticatorAppSection = ({
    authStatus,
    authStatusLoading,
    authStatusError,
    mfaStatusError,
    labels,
    t,
    step,
    qrCodeUrl,
    secretKey,
    isSubmitting,
    errorKey,
    startSetup,
    verifySetup,
    retryEnable,
    cancelSetup,
    disable,
}) => {
    const labelId = useId();
    const rowRef = useRef(null);
    const rowActionRef = useRef(null);
    const isIdle = step === "idle" && disable.step === "idle";
    const wasIdleRef = useRef(isIdle);

    useEffect(() => {
        const returnedToIdle = !wasIdleRef.current && isIdle;
        wasIdleRef.current = isIdle;

        if (returnedToIdle) {
            (rowActionRef.current ?? rowRef.current)?.focus();
        }
    }, [isIdle]);

    if (authStatusLoading) {
        return null;
    }

    const toErrorText = (key) => (key ? (t.errors[key] ?? t.errors.generic) : null);
    const isUnavailable = authStatusError || mfaStatusError;
    const statusPill = getStatusPill(authStatus, isUnavailable, labels);
    const isActive = !isUnavailable && authStatus.preferredMFA === "TOTP";
    const canSetUp = !isUnavailable && !isActive && isIdle;
    const canTurnOff = isActive && isIdle;
    const errorText = toErrorText(errorKey);
    const disableErrorText = toErrorText(disable.errorKey);
    const rowErrorText = isIdle ? (disableErrorText ?? errorText) : null;

    const renderPanel = () => {
        if (disable.step === "confirm") {
            return (
                <DisableConfirmPanel
                    t={t}
                    isSubmitting={disable.isSubmitting}
                    errorText={disableErrorText}
                    onConfirm={disable.confirmDisable}
                    onCancel={disable.cancelDisable}
                />
            );
        }
        if (disable.step === "done") {
            return <DonePanel message={t.disabledSuccess} closeLabel={t.close} onClose={disable.cancelDisable} />;
        }
        if (step === "setup") {
            return (
                <SetupPanel
                    t={t}
                    qrCodeUrl={qrCodeUrl}
                    secretKey={secretKey}
                    isSubmitting={isSubmitting}
                    errorText={errorText}
                    onVerify={verifySetup}
                    onCancel={cancelSetup}
                />
            );
        }
        if (step === "enablePending") {
            return (
                <EnablePendingPanel
                    t={t}
                    isSubmitting={isSubmitting}
                    errorText={errorText}
                    onRetry={retryEnable}
                    onCancel={cancelSetup}
                />
            );
        }
        if (step === "done") {
            return <DonePanel message={t.success} closeLabel={t.close} onClose={cancelSetup} />;
        }
        return null;
    };

    return (
        <>
            <div ref={rowRef} className="pd-auth-row" role="group" aria-labelledby={labelId} tabIndex={-1}>
                <span id={labelId} className="pd-pref-label">
                    {labels.authenticatorApp}
                </span>
                <span className={`pd-status-pill pd-status-pill--${statusPill.modifier}`}>{statusPill.text}</span>
                {canSetUp && (
                    <button
                        ref={rowActionRef}
                        type="button"
                        className="pd-verify-btn pd-authenticator-setup-btn"
                        onClick={startSetup}
                        disabled={isSubmitting}
                    >
                        {t.setUp}
                    </button>
                )}
                {canTurnOff && (
                    <button
                        ref={rowActionRef}
                        type="button"
                        className="pd-verify-btn pd-authenticator-setup-btn"
                        onClick={disable.requestDisable}
                        disabled={disable.isSubmitting}
                    >
                        {t.turnOff}
                    </button>
                )}
            </div>

            {rowErrorText && (
                <div className="pd-authenticator-row-error">
                    <ErrorText text={rowErrorText} />
                </div>
            )}

            {renderPanel()}
        </>
    );
};

AuthenticatorAppSection.propTypes = {
    authStatus: authStatusShape.isRequired,
    authStatusLoading: PropTypes.bool.isRequired,
    authStatusError: PropTypes.bool.isRequired,
    mfaStatusError: PropTypes.bool.isRequired,
    labels: PropTypes.shape({
        authenticatorApp: PropTypes.string.isRequired,
        active: PropTypes.string.isRequired,
        inactive: PropTypes.string.isRequired,
        unavailable: PropTypes.string.isRequired,
    }).isRequired,
    t: PropTypes.shape({
        setUp: PropTypes.string.isRequired,
        setupTitle: PropTypes.string.isRequired,
        scanInstruction: PropTypes.string.isRequired,
        qrAlt: PropTypes.string.isRequired,
        manualKeyLabel: PropTypes.string.isRequired,
        codeLabel: PropTypes.string.isRequired,
        verify: PropTypes.string.isRequired,
        verifying: PropTypes.string.isRequired,
        cancel: PropTypes.string.isRequired,
        tryAgain: PropTypes.string.isRequired,
        close: PropTypes.string.isRequired,
        success: PropTypes.string.isRequired,
        turnOff: PropTypes.string.isRequired,
        disableTitle: PropTypes.string.isRequired,
        disableWarning: PropTypes.string.isRequired,
        confirmTurnOff: PropTypes.string.isRequired,
        turningOff: PropTypes.string.isRequired,
        disabledSuccess: PropTypes.string.isRequired,
        errors: PropTypes.objectOf(PropTypes.string).isRequired,
    }).isRequired,
    step: PropTypes.oneOf(["idle", "setup", "enablePending", "done"]).isRequired,
    qrCodeUrl: PropTypes.string.isRequired,
    secretKey: PropTypes.string.isRequired,
    isSubmitting: PropTypes.bool.isRequired,
    errorKey: PropTypes.string,
    startSetup: PropTypes.func.isRequired,
    verifySetup: PropTypes.func.isRequired,
    retryEnable: PropTypes.func.isRequired,
    cancelSetup: PropTypes.func.isRequired,
    disable: PropTypes.shape({
        step: PropTypes.oneOf(["idle", "confirm", "done"]).isRequired,
        isSubmitting: PropTypes.bool.isRequired,
        errorKey: PropTypes.string,
        requestDisable: PropTypes.func.isRequired,
        confirmDisable: PropTypes.func.isRequired,
        cancelDisable: PropTypes.func.isRequired,
    }).isRequired,
};

export default AuthenticatorAppSection;
