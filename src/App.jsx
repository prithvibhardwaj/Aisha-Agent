import React, { useState, useEffect } from 'react';
import Aisha from './components/Aisha';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if a user is currently logged in (Active Session)
    const activeSession = sessionStorage.getItem('emaar_active_user');
    if (activeSession) {
      setUser(JSON.parse(activeSession));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Save the ACTIVE session
    sessionStorage.setItem('emaar_active_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    // Clear the ACTIVE session (but keep the registered users in the DB)
    sessionStorage.removeItem('emaar_active_user');
  };

  return (
    <div>
      {user ? (
        <Aisha user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;