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
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    useEffect(() => {
        const handleKeyUp = (event) => {
            if (event.key === 'Enter') {
                handleSubmit(event);
            }
        };

        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [formData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const minDelay = new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const [{ data }] = await Promise.all([
                api.post('/auth/register/', formData),
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

                <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        name="username"
                        placeholder="choose a username"
                        onChange={handleChange}
                        autoComplete="username"
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
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        onChange={handleChange}
                        autoComplete="new-password"
                    />
                </div>

                <button onClick={handleSubmit}>Create Account</button>

                <p>Already have an account? <Link to="/login">Sign in</Link></p>
            </div>
        </div>
    );
}

export default Register;