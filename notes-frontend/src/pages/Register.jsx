import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from '../api/axios';
import './register.css';
import LoginLoader from '../components/LoginLoader';

const registerMessages = [
    "Inking your name in the journal…",
    "Binding a fresh notebook for you…",
    "Ruling the first page…",
    "Sharpening a pencil…",
    "Stocking up on sticky notes…",
    "Almost ready to write…",
];

function Register() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const navigate = useNavigate();

    // Email Verification States
    const [codeSent, setCodeSent] = useState(false);
    const [sentEmail, setSentEmail] = useState('');
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);

    // Password Toggle State
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Cooldown countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    useEffect(() => {
        const handleKeyUp = (event) => {
            if (event.key === 'Enter') {
                if (codeSent && formData.email === sentEmail) {
                    handleSubmit(event);
                } else if (formData.email) {
                    handleSendVerificationCode();
                }
            }
        };

        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [formData, codeSent, sentEmail, codeDigits]);

    const handleSendVerificationCode = async () => {
        if (!formData.email) {
            setError({ error_view: "Please enter your email first" });
            return;
        }
        setError('');
        setSuccessMsg('');
        setSendingCode(true);

        try {
            await api.post('/auth/send-code/', { email: formData.email });
            setCodeSent(true);
            setSentEmail(formData.email);
            setCountdown(120); // 2 minutes cooldown
            setSuccessMsg("Verification code sent successfully to " + formData.email);
        } catch (err) {
            setError({ error_view: err.response?.data?.error_view || err.response?.data?.detail || "Failed to send verification code." });
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
            const nextInput = document.getElementById(`register-digit-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleDigitKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
            const prevInput = document.getElementById(`register-digit-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleDigitPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        if (/^\d{6}$/.test(pastedData)) {
            const newDigits = pastedData.split('');
            setCodeDigits(newDigits);
            document.getElementById('register-digit-5')?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const code = codeDigits.join('');
        if (code.length !== 6) {
            setError({ error_view: "Please enter the full 6-digit verification code" });
            return;
        }

        setIsLoading(true);

        const minDelay = new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const [{ data }] = await Promise.all([
                api.post('/auth/register/', { ...formData, code }),
                minDelay
            ]);
            if (data.token) localStorage.setItem('token', data.token);
            if (data.username) localStorage.setItem('username', data.username);

            // Migrate guest notes
            const guestNotes = localStorage.getItem('guest_notes');
            if (guestNotes) {
                try {
                    const notesArray = JSON.parse(guestNotes);
                    if (notesArray && notesArray.length > 0) {
                        await Promise.all(notesArray.map(note =>
                            api.post('/notes/', {
                                title: note.title,
                                content: note.content,
                                is_checklist: note.is_checklist,
                                is_pinned: note.is_pinned || false,
                                items: note.items ? note.items.map(item => ({ text: item.text, checked: item.checked })) : []
                            })
                        ));
                    }
                    localStorage.removeItem('guest_notes');
                } catch (migrateErr) {
                    console.error("Failed to migrate guest notes:", migrateErr);
                }
            }

            navigate('/notes');
        } catch (err) {
            await minDelay;
            if (err.response?.data?.detail) {
                setError({ error_view: err.response?.data?.detail });
            } else if (err.response?.data?.error_view) {
                setError({ error_view: err.response?.data?.error_view });
            } else {
                setError(err.response?.data || {});
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueAsGuest = () => {
        localStorage.removeItem('token');
        localStorage.setItem('username', 'Guest');
        navigate('/notes');
    };

    const showVerificationAndRegister = codeSent && formData.email === sentEmail;

    return (
        <div className="register-bg">
            {isLoading && <LoginLoader messages={registerMessages} />}
            <div className="register-div">

                {/* Header */}
                <div className="register-header">
                    <h2>Create account.</h2>
                    <p className="subtitle">Start writing your notes</p>
                    <div className="divider" />
                </div>

                {/* Error messages */}
                {error.error_view && <p className="error-line">{error.error_view}</p>}
                {error.username && <p className="error-line">Username: {error.username[0]}</p>}
                {error.email && <p className="error-line">Email: {error.email[0]}</p>}
                {error.password && <p className="error-line">Password: {error.password[0]}</p>}
                {error.code && <p className="error-line">Code: {error.code[0]}</p>}

                <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        name="username"
                        placeholder="choose a username"
                        onChange={handleChange}
                        autoComplete="username"
                        value={formData.username}
                    />
                </div>

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

                {successMsg && <p className="success-line">{successMsg}</p>}

                {!showVerificationAndRegister && (
                    <div className="send-code-container">
                        <button
                            type="button"
                            className="send-code-btn"
                            onClick={handleSendVerificationCode}
                            disabled={sendingCode || countdown > 0}
                        >
                            {sendingCode ? "Sending code..." : countdown > 0 ? `Resend in ${countdown}s` : codeSent ? "Resend Code" : "Send Verification Code"}
                        </button>
                    </div>
                )}

                {showVerificationAndRegister && (
                    <>
                        <div className="input-group" style={{ marginTop: '1.2rem' }}>
                            <label>Verification Code</label>
                            <div className="verification-code-container" onPaste={handleDigitPaste}>
                                {codeDigits.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        id={`register-digit-${idx}`}
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

                        <div className="send-code-container">
                            <button
                                type="button"
                                className="send-code-btn"
                                onClick={handleSendVerificationCode}
                                disabled={sendingCode || countdown > 0}
                                style={{ marginTop: '0.5rem', marginBottom: '1.2rem', width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                                {sendingCode ? "Sending..." : countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
                            </button>
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    onChange={handleChange}
                                    autoComplete="new-password"
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

                        <button onClick={handleSubmit}>Verify Code & Create Account</button>
                    </>
                )}

                <p style={{ marginTop: '0.8rem' }}>Already have an account? <Link to="/login">Sign in</Link></p>

                <div className="guest-link-container">
                    <a href="#" className="guest-link" onClick={(e) => { e.preventDefault(); handleContinueAsGuest(); }}>
                        Continue as Guest &rarr;
                    </a>
                </div>
            </div>
        </div>
    );
}

export default Register;