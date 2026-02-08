import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  // --- MOCK DATABASE LOGIC ---
  const getUsersDB = () => {
    const db = sessionStorage.getItem('emaar_users_db');
    return db ? JSON.parse(db) : [];
  };

  const saveToUsersDB = (newUser) => {
    const currentDB = getUsersDB();
    const updatedDB = [...currentDB, newUser];
    sessionStorage.setItem('emaar_users_db', JSON.stringify(updatedDB));
  };
  // ---------------------------

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // 1. Basic Field Validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (isSignUp) {
      // --- SIGN UP LOGIC ---
      if (!formData.name) {
        setError('Please enter your name');
        return;
      }

      const users = getUsersDB();
      const existingUser = users.find(u => u.email === formData.email);

      if (existingUser) {
        setError('This email is already registered. Please Sign In.');
        return;
      }

      // Create new user object
      const newUser = {
        name: formData.name,
        email: formData.email,
        password: formData.password
      };

      saveToUsersDB(newUser);
      
      // Auto-login after registration
      onLogin({ name: newUser.name, email: newUser.email });

    } else {
      // --- LOGIN LOGIC ---
      const users = getUsersDB();
      const validUser = users.find(
        u => u.email === formData.email && u.password === formData.password
      );

      if (validUser) {
        // Success: Pass only public info (not password) to App
        onLogin({ name: validUser.name, email: validUser.email });
      } else {
        // Failure
        setError('Invalid email or password.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-700 p-8 text-center relative overflow-hidden">
          <div className="relative z-10 pt-4">
            <h2 className="text-3xl font-bold text-white mb-1">Aisha</h2>
            <p className="text-amber-100 text-sm tracking-wide uppercase">Emaar Residence Assistant</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <h3 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            {isSignUp ? "Create Residence Account" : "Resident Login"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name Field (Sign Up Only) */}
            {isSignUp && (
              <div className="relative animate-in fade-in slide-in-from-top-2">
                <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            )}

            {/* Email Field */}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input 
                type="email" 
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input 
                type="password" 
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm justify-center bg-red-50 p-2 rounded-lg">
                <AlertCircle size={16} />
                <p>{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-slate-800 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              {isSignUp ? "Register" : "Sign In"}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              {isSignUp ? "Already have an account? " : "New to Emaar? "}
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(''); // Clear errors when switching
                  setFormData({ name: '', email: '', password: '' });
                }}
                className="text-amber-600 font-semibold hover:text-amber-700 underline decoration-2 underline-offset-4"
              >
                {isSignUp ? "Sign In" : "Register Here"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;