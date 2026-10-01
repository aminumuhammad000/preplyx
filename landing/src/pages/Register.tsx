import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

import { API_BASE_URL } from '../config/api';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/register`, {
        name,
        email,
        password,
      });
      login(data, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-primary mb-6">Create Account</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-text-dark font-medium mb-1">Name</label>
            <input 
              type="text" 
              required 
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-text-dark font-medium mb-1">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-text-dark font-medium mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-opacity-90 transition"
          >
            Register
          </button>
        </form>
        <p className="text-center mt-4 text-text-muted">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
