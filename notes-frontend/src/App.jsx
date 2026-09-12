import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Notes from './pages/Notes';
import Footer from './components/Footer';
import ReloadPrompt from './components/ReloadPrompt';

// Route guard: Redirects authenticated users away from auth pages (/login, /register) to /notes
const PublicOnlyRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (token) {
        return <Navigate to="/notes" replace />;
    }
    return children;
};

function App() {
    return (
        <BrowserRouter>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/notes" replace />} />
                        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
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