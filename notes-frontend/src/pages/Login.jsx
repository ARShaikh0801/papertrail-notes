import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
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
    const [formData, setFormData] = useState({ username: '', password: '' });
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
            // const { data } = await api.post('/auth/login/', formData);
            const [{ data }] = await Promise.all([api.post('/auth/login/', formData),
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
            setError(err.response?.data?.detail || err.response?.data?.error_view || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-bg">
            {isLoading && <LoginLoader messages={loginMessages} />}
            <div className="login-div">

                {/* Header */}
                <div className="login-header">
                    <h2>Welcome back.</h2>
                    <p className="subtitle">Sign in to your notes</p>
                    <div className="divider" />
                </div>

                {error && <p className="error-line">{error}</p>}

                <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        name="username"
                        placeholder="your username"
                        onChange={handleChange}
                        autoComplete="username"
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
                        autoComplete="current-password"
                    />
                </div>

                <button onClick={handleSubmit}>Sign In</button>

                <p>No account yet? <Link to="/register">Create one</Link></p>
            </div>
        </div>
    );
}

export default Login;