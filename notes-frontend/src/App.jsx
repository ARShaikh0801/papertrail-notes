import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Notes from './pages/Notes';
import Footer from './components/Footer';
import ReloadPrompt from './components/ReloadPrompt';

function App() {
    const isLoggedIn = !!localStorage.getItem('token');

    return (
        <BrowserRouter>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/notes" />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/notes" element={<Notes />} />
                    </Routes>
                </div>
                <Footer />
                <ReloadPrompt />
            </div>
        </BrowserRouter>
    );
}

export default App;