import React, { useState, useEffect } from 'react';
import { THEME } from './constants';

const Header3D = () => {
  const [webglSupported, setWebglSupported] = useState(true);
  const [ThreeComponents, setThreeComponents] = useState(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
      
      Promise.all([
        import('@react-three/fiber'),
        import('@react-three/drei')
      ]).then(([fiber, drei]) => {
        setThreeComponents({ 
          Canvas: fiber.Canvas, 
          OrbitControls: drei.OrbitControls, 
          Sphere: drei.Sphere, 
          Box: drei.Box, 
          Float: drei.Float, 
          MeshDistortMaterial: drei.MeshDistortMaterial 
        });
      }).catch(() => setWebglSupported(false));
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported || !ThreeComponents) {
    return (
      <div className={`mb-8 h-48 rounded-3xl overflow-hidden flex items-center justify-center ${THEME.glass}`}>
        <div className="text-center">
          <h1 className={`text-4xl font-bold ${THEME.gradientText}`}>Admin Dashboard</h1>
        </div>
      </div>
    );
  }

  const { Canvas, OrbitControls, Sphere, Box, Float, MeshDistortMaterial } = ThreeComponents;

  return (
    <div className="mb-8 h-56 rounded-3xl overflow-hidden relative border border-white/5 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color={THEME.red} />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color={THEME.blue} />
        
        <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
          <Sphere args={[0.9, 64, 64]} position={[-1.5, 0, 0]}>
            <MeshDistortMaterial color={THEME.red} roughness={0.2} metalness={0.9} distort={0.4} speed={2} />
          </Sphere>
        </Float>
        
        <Float speed={2} rotationIntensity={1.5} floatIntensity={0.8}>
          <Box args={[1.2, 1.2, 1.2]} position={[1.5, 0, 0]} rotation={[0.5, 0.5, 0]}>
            <MeshDistortMaterial color={THEME.blue} roughness={0.1} metalness={1} distort={0.3} speed={1.5} />
          </Box>
        </Float>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      
      <div className="absolute bottom-6 left-8 pointer-events-none">
        <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
          ADMIN <span className={THEME.gradientText}>PORTAL</span>
        </h1>
      </div>
    </div>
  );
};

export default Header3D;