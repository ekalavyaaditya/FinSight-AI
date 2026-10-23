import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, Mail, Lock, RefreshCw, Zap, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSentEmail, setOtpSentEmail] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message.includes('verify your email')) {
        setOtpSentEmail(email);
      } else {
        setError(err.message || 'Invalid credentials');
      }
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
      await axios.post('/api/auth/verify-otp', { email: otpSentEmail, otp: otpVal });
      setOtpSentEmail('');
      setError('Account verified successfully! You can now log in.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Incorrect code');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleGoogleMockLogin = async () => {
    setLoading(true);
    try {
      const axios = (await import('axios')).default;
      const response = await axios.post('/api/auth/oauth/google', {
        email: 'alex.carter@gmail.com',
        name: 'Alex Carter',
        googleId: 'g-1234567890',
      });

      const { accessToken, refreshToken, user } = response.data;
      localStorage.setItem('finsight_token', accessToken);
      localStorage.setItem('finsight_refresh_token', refreshToken);
      localStorage.setItem('finsight_user', JSON.stringify(user));

      useAuthStore.setState({
        token: accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError('OAuth login simulation failed');
    } finally {
      setLoading(false);
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
          <h2 className="text-2xl font-extrabold tracking-tight">Access FinSight AI</h2>
          <p className="text-xs text-neutral-400 font-light">Verify credentials to initialize secure portal.</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl border border-rose-500/10 bg-rose-500/5 text-rose-500 text-xs font-medium text-center leading-relaxed">
            {error}
          </div>
        )}

        {otpSentEmail ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <p className="text-xs text-neutral-500 leading-relaxed text-center">
              A sandbox OTP verification code has been printed to the system server logs. Enter it below:
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Verification Code</label>
              <input
                type="text"
                placeholder="6-Digit OTP"
                value={otpVal}
                onChange={(e) => setOtpVal(e.target.value)}
                required
                className="w-full glass py-3 px-4 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all text-center tracking-widest font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={verifyingOtp}
              className="w-full py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5"
            >
              {verifyingOtp ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Confirm OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Password</label>
                <a href="#forgot" className="text-[11px] text-primary hover:underline">Forgot?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full glass py-3 pl-11 pr-12 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <label htmlFor="remember" className="text-xs text-neutral-500 font-light select-none">Remember this browser profile</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 shadow-premium"
            >
              {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Log In'}
            </button>

            <div className="relative my-6 text-center">
              <span className="bg-background px-3 text-[10px] uppercase font-bold tracking-widest text-neutral-400 relative z-10">Or Connect Via</span>
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-border z-0" />
            </div>

            <button
              type="button"
              onClick={handleGoogleMockLogin}
              className="w-full py-2.5 rounded-full text-xs font-semibold text-neutral-700 dark:text-neutral-200 glass border border-border hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-primary animate-pulse" /> Simulate Google OAuth Onboarding
            </button>

            <p className="text-xs text-center text-neutral-500 font-light mt-4">
              Need to create a portfolio?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">Register account</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
