import axios from 'axios';

const getBaseURL = () => {
    const { hostname, origin } = window.location;
    if (hostname.includes('devtunnels.ms')) {
        return `${origin.replace('-5173', '-8000').replace('-4173', '-8000')}/api`;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000/api';
    }
    return 'https://papertrail-notes.onrender.com/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
});

// Automatically attach token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Automatically handle global API errors (like 401 Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            if (error.response.status === 401) {
                // Clear credentials if token is expired/invalid
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                // Redirect to login if they are not already on login/register pages
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;