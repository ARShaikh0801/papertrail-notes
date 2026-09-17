import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { migrateGuestNotes } from '../utils/guestMigration';
import './login.css';
import LoginLoader from '../components/LoginLoader.jsx';

const loginMessages = [
    "Turning the key…",
    "Cracking open the journal…",
    "Blowing the dust off…",
    "Finding your last page…",
    "Uncapping the pen…",
    "Welcome back…",
];

function Login() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const navigate = useNavigate();

    // Forgot Password States
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [sentEmail, setSentEmail] = useState('');
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
    const [resetPasswords, setResetPasswords] = useState({ password: '', confirmPassword: '' });

    // Password Toggle States
    const [showPassword, setShowPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const showVerificationAndReset = forgotPasswordMode && codeSent && formData.email === sentEmail;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleResetPasswordChange = (e) => {
        setResetPasswords({ ...resetPasswords, [e.target.name]: e.target.value });
    };

    const resetForgotPasswordState = () => {
        setForgotPasswordMode(false);
        setCodeSent(false);
        setSentEmail('');
        setCountdown(0);
        setCodeDigits(["", "", "", "", "", ""]);
        setResetPasswords({ password: '', confirmPassword: '' });
        setShowPassword(false);
        setShowResetPassword(false);
        setShowConfirmPassword(false);
        setSuccessMsg('');
        setError('');
    };

    // Cooldown countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Handle keyup Enter
    useEffect(() => {
        const handleKeyUp = (event) => {
            if (event.key === 'Enter') {
                if (forgotPasswordMode) {
                    if (showVerificationAndReset) {
                        handleResetSubmit(event);
                    } else if (formData.email) {
                        handleSendResetCode();
                    }
                } else {
                    handleSubmit(event);
                }
            }
        };

        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [formData, forgotPasswordMode, codeSent, sentEmail, codeDigits, resetPasswords]);

    const handleSendResetCode = async () => {
        if (!formData.email) {
            setError("Please enter your email first");
            return;
        }
        setError("");
        setSuccessMsg("");
        setSendingCode(true);

        try {
            await api.post('/auth/forgot-password/send-code/', { email: formData.email });
            setCodeSent(true);
            setSentEmail(formData.email);
            setCountdown(120); // 2 minutes cooldown
            setSuccessMsg("Verification code sent successfully to " + formData.email + ". (Please also check your spam folder)");
        } catch (err) {
            setError(err.response?.data?.error_view || err.response?.data?.detail || "Failed to send reset code.");
        } finally {
            setSendingCode(false);
        }
    };

    const handleDigitChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newDigits = [...codeDigits];
        newDigits[index] = value;
        setCodeDigits(newDigits);

        if (value && index < 5) {
            const nextInput = document.getElementById(`reset-digit-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleDigitKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
            const prevInput = document.getElementById(`reset-digit-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleDigitPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        if (/^\d{6}$/.test(pastedData)) {
            const newDigits = pastedData.split('');
            setCodeDigits(newDigits);
            document.getElementById('reset-digit-5')?.focus();
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();

        const code = codeDigits.join('');
        if (code.length !== 6) {
            setError("Please enter the full 6-digit verification code");
            return;
        }

        if (!resetPasswords.password || !resetPasswords.confirmPassword) {
            setError("Please fill out both password fields");
            return;
        }

        if (resetPasswords.password !== resetPasswords.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        const minDelay = new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const [{ data }] = await Promise.all([
                api.post('/auth/forgot-password/reset/', {
                    email: formData.email,
                    code: code,
                    password: resetPasswords.password
                }),
                minDelay
            ]);
            if (data.token) localStorage.setItem('token', data.token);
            if (data.username) localStorage.setItem('username', data.username);

            // Migrate guest notes idempotently
            await migrateGuestNotes(api);

            navigate('/notes');
        } catch (err) {
            await minDelay;
            setError(err.response?.data?.error_view || err.response?.data?.detail || "Failed to reset password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const minDelay = new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const [{ data }] = await Promise.all([api.post('/auth/login/', {
                username: formData.username,
                password: formData.password
            }),
                minDelay
            ]);
            if (data.token) localStorage.setItem('token', data.token);
            if (data.username) localStorage.setItem('username', data.username);
            
            // Migrate guest notes idempotently
            await migrateGuestNotes(api);

            navigate('/notes');
        } catch (err) {
            await minDelay;
            setError(err.response?.data?.detail || err.response?.data?.error_view || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueAsGuest = () => {
        localStorage.removeItem('token');
        localStorage.setItem('username', 'Guest');
        navigate('/notes');
    };

    return (
        <div className="login-bg">
            {isLoading && <LoginLoader messages={loginMessages} />}
            <div className="login-div">

                {/* Close Button */}
                {forgotPasswordMode && (
                    <button className="login-close-btn" onClick={resetForgotPasswordState} aria-label="Close forgot password mode">
                        &times;
                    </button>
                )}

                {/* Header */}
                <div className="login-header">
                    <h2>{forgotPasswordMode ? "Reset password." : "Welcome back."}</h2>
                    <p className="subtitle">{forgotPasswordMode ? "Recover access to your notes" : "Sign in to your notes"}</p>
                    <div className="divider" />
                </div>

                {error && <p className="error-line">{error}</p>}
                {successMsg && <p className="success-line">{successMsg}</p>}

                <div className="input-group">
                    <label htmlFor="username">{forgotPasswordMode ? "Username (optional)" : "Username"}</label>
                    <input
                        id="username"
                        name="username"
                        placeholder="your username"
                        onChange={handleChange}
                        autoComplete="username"
                        value={formData.username}
                    />
                </div>

                {forgotPasswordMode && (
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="your@email.com"
                            onChange={handleChange}
                            autoComplete="email"
                            value={formData.email}
                        />
                    </div>
                )}

                {!forgotPasswordMode && (
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                onChange={handleChange}
                                autoComplete="current-password"
                                value={formData.password}
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {forgotPasswordMode && (
                    <div className="send-code-container">
                        <button
                            type="button"
                            className="send-code-btn"
                            onClick={handleSendResetCode}
                            disabled={sendingCode || countdown > 0}
                        >
                            {sendingCode ? "Sending code..." : countdown > 0 ? `Resend in ${countdown}s` : codeSent ? "Resend Code" : "Send Verification Code"}
                        </button>
                    </div>
                )}

                {showVerificationAndReset && (
                    <>
                        <div className="input-group" style={{ marginTop: '1.2rem' }}>
                            <label>Verification Code</label>
                            <div className="verification-code-container" onPaste={handleDigitPaste}>
                                {codeDigits.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        id={`reset-digit-${idx}`}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        className="digit-input"
                                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                                        autoComplete="off"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="reset-password">New Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="reset-password"
                                    name="password"
                                    type={showResetPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    onChange={handleResetPasswordChange}
                                    autoComplete="new-password"
                                    value={resetPasswords.password}
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowResetPassword(!showResetPassword)}
                                    tabIndex="-1"
                                    aria-label={showResetPassword ? "Hide password" : "Show password"}
                                >
                                    {showResetPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    onChange={handleResetPasswordChange}
                                    autoComplete="new-password"
                                    value={resetPasswords.confirmPassword}
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex="-1"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button className="register-submit-btn" onClick={handleResetSubmit}>Change Password & Log In</button>
                    </>
                )}

                {!forgotPasswordMode && <button onClick={handleSubmit}>Sign In</button>}

                {!forgotPasswordMode && (
                    <p className="forgot-password-container">
                        <a href="#" className="forgot-password-link" onClick={(e) => { e.preventDefault(); setForgotPasswordMode(true); }}>Forgot password?</a>
                    </p>
                )}

                {forgotPasswordMode && (
                    <p className="forgot-password-container" style={{ marginTop: '0.8rem' }}>
                        <a href="#" className="forgot-password-link" onClick={(e) => { e.preventDefault(); resetForgotPasswordState(); }}>Cancel & Back to Sign In</a>
                    </p>
                )}

                <p style={{ marginTop: '0.8rem' }}>No account yet? <Link to="/register">Create one</Link></p>

                <div className="guest-link-container">
                    <a href="#" className="guest-link" onClick={(e) => { e.preventDefault(); handleContinueAsGuest(); }}>
                        Continue as Guest &rarr;
                    </a>
                </div>
            </div>
        </div>
    );
}

export default Login;