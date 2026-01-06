import React from 'react';

const ActivityLog = ({ remarks, addRemark }) => {
  const [remarkText, setRemarkText] = useState('');

  const handleSubmit = () => {
    if (remarkText.trim()) {
      addRemark(remarkText);
      setRemarkText('');
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-slate-500 font-bold text-sm uppercase">Activity Log</h4>
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        {remarks?.map((rem, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-xs font-bold text-white">
              {rem.addedBy?.name?.charAt(0)}
            </div>
            <div className="flex-1 bg-white/5 p-3 rounded-r-xl rounded-bl-xl">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{rem.addedBy?.name}</span>
                <span>{new Date(rem.addedAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-300">{rem.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={remarkText}
          onChange={(e) => setRemarkText(e.target.value)}
          placeholder="Add an internal note..." 
          className="flex-1 bg-[#0f172a] border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-[#455185] outline-none"
          onKeyDown={(e) => { if(e.key === 'Enter') handleSubmit(); }}
        />
        <button 
          onClick={handleSubmit}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors"
        >Send</button>
      </div>
    </div>
  );
};

export default ActivityLog;