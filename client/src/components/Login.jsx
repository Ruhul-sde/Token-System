import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';

/* ===================== 3D BACKGROUND ===================== */
const Scene = () => (
  <>
    <ambientLight intensity={0.4} />
    <pointLight position={[10, 10, 10]} intensity={1} />
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[1, 100, 100]} scale={2.4}>
        <MeshDistortMaterial
          color="#ED1B2F"
          distort={0.4}
          speed={1.5}
          roughness={0.1}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  </>
);

/* ===================== LOGIN COMPONENT ===================== */
const Login = () => {
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Account not found. Please contact your administrator.');
          }
          throw new Error('Unable to process request. Please try again.');
        }

        setSuccess('Password reset link has been sent to your email.');
        setTimeout(() => setIsForgotPassword(false), 3000);
      } else {
        await login(formData.email, formData.password);
        navigate('/');
      }
    } catch (err) {
      /* ===== CLEAN ERROR MESSAGES ===== */
      if (err?.response?.status) {
        switch (err.response.status) {
          case 401:
            setError('Invalid email or password. Please try again.');
            break;
          case 403:
            setError('Your account is inactive or access is restricted.');
            break;
          case 404:
            setError('Account not found. Please contact your administrator.');
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError('Authentication failed. Please try again.');
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Unable to reach the server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0f121d] overflow-hidden">

      {/* ===================== LEFT PANEL ===================== */}
      <div className="hidden md:flex md:w-1/2 relative items-center justify-center bg-gradient-to-br from-[#455185] to-[#0f121d]">
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <Scene />
            <OrbitControls enableZoom={false} />
          </Canvas>
        </div>

        <div className="relative z-10 text-center px-12">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 inline-block mb-8">
            <img src={logo} alt="Logo" className="w-24 h-24 object-contain" />
          </div>
          <h2 className="text-5xl font-black text-white mb-4">
            ELEVATING <br />
            <span className="text-[#ED1B2F]">TICKETING.</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-sm mx-auto">
            Streamlined support and incident management for modern enterprises.
          </p>
        </div>
      </div>

      {/* ===================== RIGHT PANEL ===================== */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-16 bg-white">
        <div className="w-full max-w-md">

          <header className="mb-10">
            <h1 className="text-3xl font-bold text-[#455185]">
              {isForgotPassword ? 'Reset Access' : 'Welcome Back'}
            </h1>
            <p className="text-gray-500 mt-2">
              {isForgotPassword
                ? 'Enter your registered email to receive a reset link.'
                : 'Enter your credentials to continue.'}
            </p>
          </header>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border-l-4 border-[#ED1B2F] text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl border-l-4 border-green-500 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              icon={<Mail size={18} />}
              name="email"
              type="email"
              placeholder="Email or Employee Code"
              value={formData.email}
              onChange={handleInputChange}
            />

            {!isForgotPassword && (
              <div className="relative">
                <InputField
                  icon={<Lock size={18} />}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {!isForgotPassword && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm font-semibold text-[#455185] hover:text-[#ED1B2F]"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#455185] hover:bg-[#343d64] text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {isForgotPassword ? 'Send Reset Link' : 'Sign In'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {isForgotPassword && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsForgotPassword(false)}
                className="text-[#ED1B2F] font-bold hover:underline"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ===================== INPUT FIELD ===================== */
const InputField = ({ icon, ...props }) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
      {icon}
    </div>
    <input
      {...props}
      required
      className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#455185]/20 outline-none"
    />
  </div>
);

export default Login;
