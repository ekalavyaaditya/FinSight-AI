import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, Mail, Lock, User, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(email, password, fullName);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingOtp(true);
    setError('');
    try {
      const axios = (await import('axios')).default;
      await axios.post('/api/auth/verify-otp', { email, otp: otpVal });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Incorrect OTP code');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8f9fa] dark:bg-[#07070a]">
      <div className="w-full max-w-md glass p-8 rounded-3xl border border-border shadow-2xl relative">
        <div className="absolute top-0 right-0 p-4">
          <Link to="/" className="text-xs text-neutral-400 hover:text-primary">← Back Home</Link>
        </div>

        <div className="text-center mb-8 space-y-2">
          <span className="text-2xl">📈</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Create Portfolio Profile</h2>
          <p className="text-xs text-neutral-400 font-light">Onboard your personal finance intelligence engine.</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl border border-rose-500/10 bg-rose-500/5 text-rose-500 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {success ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
              <h3 className="text-lg font-bold">Check Server Log Output!</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                For complete ease of sandbox/local development testing, the verification code has been printed to the <b>node server console logs</b>. Please check your console.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Sandbox verification Code</label>
              <input
                type="text"
                placeholder="6-Digit OTP"
                value={otpVal}
                onChange={(e) => setOtpVal(e.target.value)}
                required
                className="w-full glass py-3 px-4 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-center font-bold tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={verifyingOtp}
              className="w-full py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5"
            >
              {verifyingOtp ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Confirm Registration Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Alex Carter"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full glass py-3 pl-11 pr-4 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full glass py-3 pl-11 pr-4 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
                <input
                  type="password"
                  placeholder="Min 8 characters, uppercase & number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full glass py-3 pl-11 pr-4 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 shadow-premium"
            >
              {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Register Account'}
            </button>

            <p className="text-xs text-center text-neutral-500 font-light mt-4">
              Already have a portfolio?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
