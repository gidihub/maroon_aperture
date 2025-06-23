import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { Link, useNavigate } from 'react-router-dom';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setError('');
      alert('Signup successful!');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">Sign Up</h1>
      <form onSubmit={handleSignup} className="flex gap-2">
        <input
          className="border px-4 py-2 rounded"
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="border px-4 py-2 rounded"
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Sign Up
        </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      <p className="mt-4 text-gray-600 text-sm">
        Already have an account?{' '}
        <Link to="/" className="text-blue-600 hover:underline">Log In</Link>
      </p>
    </div>
  );
}
