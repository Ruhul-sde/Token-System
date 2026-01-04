import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  PlusIcon, 
  XMarkIcon, 
  PaperClipIcon, 
  RocketLaunchIcon, 
  ChatBubbleBottomCenterTextIcon,
  StarIcon 
} from '@heroicons/react/24/outline';

/**
 * Modern 3D Visual Header
 * Utilizes dynamic imports for WebGL to ensure performance
 */
const InteractiveHeader = () => {
  const [ThreeStack, setThreeStack] = useState(null);

  useEffect(() => {
    const initThree = async () => {
      try {
        const fiber = await import('@react-three/fiber');
        const drei = await import('@react-three/drei');
        setThreeStack({ ...fiber, ...drei });
      } catch (e) {
        console.error("WebGL Initialization Failed", e);
      }
    };
    initThree();
  }, []);

  if (!ThreeStack) return (
    <div className="h-44 w-full rounded-3xl bg-gradient-to-r from-[#ED1B2F] to-[#455185] animate-pulse flex items-center justify-center">
      <h1 className="text-white font-black text-3xl tracking-tighter uppercase italic">Control Center</h1>
    </div>
  );

  const { Canvas, Float, Sphere, MeshDistortMaterial, OrbitControls } = ThreeStack;

  return (
    <div className="relative h-48 w-full rounded-3xl overflow-hidden mb-10 shadow-[0_20px_50px_rgba(237,27,47,0.2)]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-3xl z-10 pointer-events-none" />
      <div className="absolute top-10 left-10 z-20">
        <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">Support Hub</h1>
        <div className="h-1 w-20 bg-[#ED1B2F] mt-2 rounded-full" />
      </div>
      
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={1} />
        <pointLight position={[10, 10, 10]} />
        <Float speed={2} rotationIntensity={2}>
          <Sphere args={[1.4, 64, 64]} position={[-3, 0, 0]}>
            <MeshDistortMaterial color="#ED1B2F" speed={3} distort={0.5} metalness={0.9} />
          </Sphere>
        </Float>
        <Float speed={3} rotationIntensity={1}>
          <Sphere args={[1, 64, 64]} position={[3, -1, 0]}>
            <MeshDistortMaterial color="#455185" speed={4} distort={0.6} metalness={0.8} />
          </Sphere>
        </Float>
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
};

/**
 * Redesigned Support Dashboard
 */
const UserDashboard = () => {
  // State Orchestration
  const [supportTickets, setSupportTickets] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ticketDraft, setTicketDraft] = useState({
    title: '',
    description: '',
    priority: 'medium',
    department: '',
    category: '',
    attachments: []
  });

  const { API_URL, user } = useAuth();

  // Data Fetching
  const syncDashboardData = useCallback(async () => {
    try {
      const [ticketRes, deptRes] = await Promise.all([
        axios.get(`${API_URL}/tickets`),
        axios.get(`${API_URL}/departments`)
      ]);
      setSupportTickets(ticketRes.data.filter(t => t.createdBy?._id === user._id));
      setOrgUnits(deptRes.data);
    } catch (err) {
      console.error("Sync Error", err);
    }
  }, [API_URL, user._id]);

  useEffect(() => { syncDashboardData(); }, [syncDashboardData]);

  // Logic: File Handling
  const handleAttachment = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTicketDraft(prev => ({
          ...prev,
          attachments: [...prev.attachments, { name: file.name, data: reader.result, type: file.type }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // Logic: Submission
  const handleTicketSubmission = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/tickets`, ticketDraft);
      setIsDrafting(false);
      setTicketDraft({ title: '', description: '', priority: 'medium', department: '', category: '', attachments: [] });
      syncDashboardData();
    } catch (err) {
      alert("Submission failed. Check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] text-slate-200 selection:bg-[#ED1B2F] selection:text-white pb-20 font-sans">
      
      {/* Dynamic Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#ED1B2F]/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-[#455185]/10 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10">
        
        <InteractiveHeader />

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-white/50 uppercase tracking-[0.3em] text-xs font-bold mb-1">Authenticated as</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ED1B2F] to-[#455185] flex items-center justify-center font-bold text-white">
                {user?.name?.charAt(0)}
              </div>
              <span className="text-2xl font-semibold text-white">{user?.name}</span>
            </div>
          </div>

          <button
            onClick={() => setIsDrafting(!isDrafting)}
            className={`group relative overflow-hidden px-8 py-4 rounded-2xl font-bold transition-all duration-500 shadow-2xl ${
              isDrafting ? 'bg-slate-800 text-white' : 'bg-[#ED1B2F] text-white hover:scale-105 active:scale-95'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isDrafting ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
              {isDrafting ? 'Discard Draft' : 'Launch New Ticket'}
            </span>
            {!isDrafting && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
          </button>
        </div>

        {/* Create Ticket Bento Box */}
        {isDrafting && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
              <form onSubmit={handleTicketSubmission} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="group">
                    <label className="text-xs font-bold text-[#455185] uppercase ml-1 mb-2 block">Issue Title</label>
                    <input
                      type="text"
                      required
                      placeholder="What's happening?"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
                      onChange={(e) => setTicketDraft({...ticketDraft, title: e.target.value})}
                    />
                  </div>
                  <div className="group">
                    <label className="text-xs font-bold text-[#455185] uppercase ml-1 mb-2 block">Deep Description</label>
                    <textarea
                      rows="5"
                      required
                      placeholder="Provide the context..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
                      onChange={(e) => setTicketDraft({...ticketDraft, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-white/5 rounded-[2rem] p-6 space-y-6 border border-white/5">
                  <div>
                    <label className="text-xs font-bold text-[#ED1B2F] uppercase mb-2 block">Priority Level</label>
                    <select 
                      className="w-full bg-slate-800 rounded-xl px-4 py-3 outline-none border border-white/10"
                      onChange={(e) => setTicketDraft({...ticketDraft, priority: e.target.value})}
                    >
                      <option value="low">Standard</option>
                      <option value="medium">Important</option>
                      <option value="high">Urgent (ASAP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#455185] uppercase mb-2 block">Department</label>
                    <select 
                      required
                      className="w-full bg-slate-800 rounded-xl px-4 py-3 outline-none border border-white/10"
                      onChange={(e) => setTicketDraft({...ticketDraft, department: e.target.value})}
                    >
                      <option value="">Select Target</option>
                      {orgUnits.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <button 
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-[#ED1B2F] to-[#b01423] rounded-2xl font-black text-white shadow-xl hover:shadow-[#ED1B2F]/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'Transmitting...' : <><RocketLaunchIcon className="w-5 h-5"/> Deploy Ticket</>}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* The Grid of Reality (Tickets) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supportTickets.length === 0 ? (
            <div className="col-span-full py-20 text-center opacity-30">
              <ChatBubbleBottomCenterTextIcon className="w-20 h-20 mx-auto mb-4" />
              <p className="text-xl italic">No transmissions found in your log.</p>
            </div>
          ) : (
            supportTickets.map((ticket) => (
              <TicketCard 
                key={ticket._id} 
                ticket={ticket} 
                onFocus={() => { setActiveTicket(ticket); setIsModalOpen(true); }} 
              />
            ))
          )}
        </div>
      </div>

      {/* Modern Modal Overlay */}
      {isModalOpen && activeTicket && (
        <TicketDetailModal 
          ticket={activeTicket} 
          close={() => setIsModalOpen(false)} 
          colors={{ red: '#ED1B2F', blue: '#455185' }}
        />
      )}
    </div>
  );
};

/**
 * Modern Ticket Card with Glassmorphism
 */
const TicketCard = ({ ticket, onFocus }) => {
  const statusStyles = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    assigned: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'in-progress': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  };

  return (
    <div 
      onClick={onFocus}
      className="group relative bg-slate-900/40 border border-white/10 rounded-[2rem] p-6 cursor-pointer hover:border-[#ED1B2F]/40 hover:bg-slate-900/60 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
        <RocketLaunchIcon className="w-8 h-8 text-[#ED1B2F]" />
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusStyles[ticket.status]}`}>
          {ticket.status}
        </span>
        <span className="text-white/20 text-xs font-mono">#{ticket._id.slice(-6)}</span>
      </div>

      <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-[#ED1B2F] transition-colors">
        {ticket.title}
      </h3>
      <p className="text-slate-400 text-sm line-clamp-2 mb-6">
        {ticket.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="text-[10px] font-bold text-slate-500 uppercase">
          {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
        <div className="flex items-center gap-1 text-[#455185]">
          <span className="text-xs font-bold uppercase">{ticket.department?.name || 'Gen'}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Functional Ticket Detail Component
 */
const TicketDetailModal = ({ ticket, close, colors }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
      <div className="absolute inset-0 bg-[#0a0c14]/90 backdrop-blur-md" onClick={close} />
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
        <div className="h-2 bg-gradient-to-r from-[#ED1B2F] to-[#455185]" />
        <div className="p-10 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">{ticket.title}</h2>
              <div className="flex gap-2">
                 <span className="px-3 py-1 bg-[#ED1B2F]/10 text-[#ED1B2F] rounded-lg text-xs font-bold">PRIORITY: {ticket.priority}</span>
              </div>
            </div>
            <button onClick={close} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="space-y-8">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-slate-300 leading-relaxed">
              {ticket.description}
            </div>

            {ticket.remarks?.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#455185] uppercase tracking-widest">Admin Response</h4>
                {ticket.remarks.map((r, i) => (
                  <div key={i} className="bg-[#455185]/10 border-l-2 border-[#455185] p-4 rounded-r-2xl">
                    <p className="text-sm text-white">{r.text}</p>
                    <span className="text-[10px] text-slate-500 mt-2 block">{new Date(r.addedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;