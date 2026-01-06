export const THEME = {
  red: '#ED1B2F',
  blue: '#455185',
  dark: '#0f172a',
  glass: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl',
  gradientText: 'bg-clip-text text-transparent bg-gradient-to-r from-[#ED1B2F] to-[#455185]',
  buttonPrimary: 'bg-gradient-to-r from-[#ED1B2F] to-[#455185] hover:opacity-90 text-white shadow-[0_0_15px_rgba(237,27,47,0.5)]',
};

export const STATUS_COLORS = {
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'in-progress': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export const PRIORITY_COLORS = {
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export const TABS = [
  { id: 'tickets', icon: '🎫', label: 'Live Tickets' },
  { id: 'solutions', icon: '💡', label: 'Knowledge Base' }
];