import { useState } from 'react';
import LabelDesigner from './components/LabelDesigner';
import LoginPage from './components/LoginPage';

const TOKEN_KEY = 'zpl-auth-token';

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function App() {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && isTokenValid(stored)) return stored;
    localStorage.removeItem(TOKEN_KEY);
    return null;
  });

  const handleLogin = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <LabelDesigner onLogout={handleLogout} />;
}

export default App;
