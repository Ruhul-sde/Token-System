import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import { Mail, Lock, User, Building2, Fingerprint, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';

// Optimized 3D Background Component
const Scene = () => {
  return (
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
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', name: '', employeeCode: '', companyName: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        const response = await fetch(`/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });
        if (response.ok) {
          setSuccess('Reset link dispatched to your inbox.');
          setTimeout(() => setIsForgotPassword(false), 3000);
        } else {
          setError('User not found or service unavailable.');
        }
      } else if (isLogin) {
        await login(formData.email, formData.password);
        navigate('/');
      } else {
        if (formData.password !== formData.confirmPassword) throw new Error("Passwords don't match");
        await register({ ...formData, role: 'user' });
        setSuccess('Account created! Access granted.');
        setTimeout(() => setIsLogin(true), 2000);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0f121d] overflow-hidden font-sans">
      
      {/* LEFT SIDE: Visual Brand Identity */}
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
          <h2 className="text-5xl font-black text-white mb-4 tracking-tighter">
            ELEVATING <br /> <span className="text-[#ED1B2F]">TICKETING.</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-sm mx-auto font-light">
            Streamlined support and incident management for modern enterprises.
          </p>
        </div>
        <div className="absolute bottom-8 left-8 text-white/30 text-xs">
          © 2026 Akshay Software Technologies Pvt. Ltd.
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-16 bg-white">
        <div className="w-full max-w-md">
          <header className="mb-10">
            <h1 className="text-3xl font-bold text-[#455185]">
              {isForgotPassword ? 'Reset Access' : isLogin ? 'Welcome Back' : 'Join the Portal'}
            </h1>
            <p className="text-gray-500 mt-2">
              {isLogin ? 'Enter your credentials to manage your tickets.' : 'Complete the form to get started.'}
            </p>
          </header>

          {/* Feedback Messages */}
          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border-l-4 border-[#ED1B2F] text-sm animate-pulse">{error}</div>}
          {success && <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl border-l-4 border-green-500 text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && !isForgotPassword && (
              <div className="grid grid-cols-1 gap-5">
                <InputField icon={<User size={18}/>} name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} />
                <InputField icon={<Building2 size={18}/>} name="companyName" placeholder="Company Name" value={formData.companyName} onChange={handleInputChange} />
                <InputField icon={<Fingerprint size={18}/>} name="employeeCode" placeholder="Employee Code" value={formData.employeeCode} onChange={handleInputChange} />
              </div>
            )}

            <InputField 
              icon={<Mail size={18}/>} 
              name="email" 
              type="email" 
              placeholder={isLogin ? "Email or Employee Code" : "Corporate Email"} 
              value={formData.email} 
              onChange={handleInputChange} 
            />

            {!isForgotPassword && (
              <div className="relative">
                <InputField 
                  icon={<Lock size={18}/>} 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#455185]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <InputField icon={<Lock size={18}/>} name="confirmPassword" type="password" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleInputChange} />
            )}

            {isLogin && !isForgotPassword && (
              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm font-semibold text-[#455185] hover:text-[#ED1B2F] transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#455185] hover:bg-[#343d64] text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-900/10 active:scale-95 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  {isForgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <footer className="mt-8 text-center">
            <p className="text-gray-500">
              {isForgotPassword ? "Remembered it?" : isLogin ? "New to the system?" : "Already a member?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setIsForgotPassword(false);
                  setError('');
                }}
                className="ml-2 text-[#ED1B2F] font-bold hover:underline"
              >
                {isForgotPassword ? 'Back to Login' : isLogin ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

// Reusable Input Sub-component for clean code
const InputField = ({ icon, ...props }) => (
  <div className="group relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#ED1B2F] transition-colors">
      {icon}
    </div>
    <input
      {...props}
      required
      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-[#455185] placeholder-gray-400 focus:bg-white focus:border-[#455185] focus:ring-4 focus:ring-[#455185]/5 outline-none transition-all"
    />
  </div>
);

export default Login;