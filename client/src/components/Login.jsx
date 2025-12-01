
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial } from '@react-three/drei';

const AnimatedSphere = () => (
  <Float speed={2} rotationIntensity={1} floatIntensity={2}>
    <mesh scale={2}>
      <sphereGeometry args={[1, 100, 100]} />
      <MeshDistortMaterial color="#ED1B2F" distort={0.3} speed={2} roughness={0.2} />
    </mesh>
  </Float>
);

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    employeeCode: '',
    companyName: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        // Handle forgot password
        const response = await fetch(`/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });

        const data = await response.json();
        if (response.ok) {
          setSuccess('Password reset link sent to your email!');
          setTimeout(() => {
            setIsForgotPassword(false);
            setFormData({ email: '', password: '', confirmPassword: '', name: '', employeeCode: '', companyName: '' });
          }, 2000);
        } else {
          setError(data.message || 'Failed to send reset link');
        }
      } else if (isLogin) {
        await login(formData.email, formData.password);
        navigate('/');
      } else {
        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        // Validate password strength
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }

        await register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          employeeCode: formData.employeeCode,
          companyName: formData.companyName,
          role: 'user'
        });
        setIsLogin(true);
        setFormData({ email: '', password: '', confirmPassword: '', name: '', employeeCode: '', companyName: '' });
        setSuccess('Registration successful! Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <AnimatedSphere />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      {/* Login/Signup Card */}
      <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="bg-[#455185]/80 p-4 rounded-xl border-2 border-[#ED1B2F]">
            <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="50,20 80,70 20,70" fill="#ED1B2F"/>
            </svg>
          </div>
        </div>

        {/* Title and Tagline */}
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          TOKEN SYSTEM
        </h1>
        <p className="text-white/80 text-center mb-6 text-sm">
          {isForgotPassword ? 'Reset Your Password' : isLogin ? 'Secure Employee Portal' : 'Create New Account'}
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 text-white p-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isForgotPassword ? (
            <>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  required
                />
              </div>
            </>
          ) : (
            <>
              {!isLogin && (
                <>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Employee Code"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder={isLogin ? "Email or Employee Code" : "Company Email"}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {!isLogin && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#b91525] text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            {isForgotPassword ? 'Send Reset Link' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {isLogin && !isForgotPassword && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsForgotPassword(true);
                setError('');
                setSuccess('');
                setFormData({ email: '', password: '', confirmPassword: '', name: '', employeeCode: '', companyName: '' });
              }}
              className="text-white/80 hover:text-white text-sm underline"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          {isForgotPassword ? (
            <p className="text-white/80 text-sm">
              Remember your password?{' '}
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                  setSuccess('');
                  setFormData({ email: '', password: '', confirmPassword: '', name: '', employeeCode: '', companyName: '' });
                }}
                className="text-[#ED1B2F] font-semibold hover:underline ml-1"
              >
                Login here
              </button>
            </p>
          ) : (
            <p className="text-white/80 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                  setFormData({ email: '', password: '', confirmPassword: '', name: '', employeeCode: '', companyName: '' });
                }}
                className="text-[#ED1B2F] font-semibold hover:underline ml-1"
              >
                {isLogin ? 'Register here' : 'Login here'}
              </button>
            </p>
          )}
        </div>

        <div className="mt-6 text-center text-white/60 text-xs">
          © 2025 Akshay Software Technologies Private Limited. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
