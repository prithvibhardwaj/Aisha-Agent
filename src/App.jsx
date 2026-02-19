import React from 'react';
import Aisha from './components/Aisha';
// import Login from './components/Login'; // Keeping this commented out so you don't lose the file

const App = () => {
  // Hardcoded developer user to bypass the login state
  const devUser = {
    name: "Prithvi",
    email: "admin@local.dev"
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <Aisha 
        user={devUser} 
        onLogout={() => console.log("Logout button clicked. Login flow is bypassed for local testing.")} 
      />
    </div>
  );
};

export default App;