import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { THEME } from './constants';

const TicketModal = ({ 
  selectedTicket, 
  setShowModal,
  tempStatus, 
  setTempStatus, 
  tempSolution, 
  setTempSolution
}) => {
  const { updateTicketStatus, addRemarkToTicket } = useAdmin();
  const [remarkText, setRemarkText] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      if (tempStatus === 'resolved' && (!tempSolution || tempSolution.length < 10)) {
        alert('Please provide a valid solution (min 10 chars).');
        return;
      }
      
      await updateTicketStatus(selectedTicket._id, tempStatus, tempSolution);
      setShowModal(false);
    } catch (error) {
      alert(error.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return;
    
    try {
      await addRemarkToTicket(selectedTicket._id, remarkText);
      setRemarkText('');
    } catch (error) {
      alert(error.message || 'Failed to add remark');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
      <div className="bg-[#1e293b] border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10 flex flex-col">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#ED1B2F]/10 to-[#455185]/10 flex justify-between items-center sticky top-0 backdrop-blur-xl">
          <div>
            <h3 className="text-xl font-bold text-white">{selectedTicket.title}</h3>
            <span className="text-xs font-mono text-slate-400">ID: {selectedTicket.ticketNumber || selectedTicket._id}</span>
          </div>
          <button 
            onClick={() => setShowModal(false)} 
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Main Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left Column: Details */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-black/20 p-6 rounded-2xl">
                <h4 className="text-[#455185] font-bold text-sm uppercase tracking-wider mb-3">Description</h4>
                <p className="text-slate-300 leading-relaxed">{selectedTicket.description}</p>
              </div>

              {/* Documents */}
              {selectedTicket.supportingDocuments?.length > 0 && (
                <div>
                  <h4 className="text-slate-500 font-bold text-sm uppercase mb-3">Attachments</h4>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {selectedTicket.supportingDocuments.map((doc, i) => (
                      <a 
                        key={i} 
                        href={doc.base64Data} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="block min-w-[100px] p-2 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors text-center"
                      >
                        <div className="text-2xl mb-1">{doc.fileType === 'image' ? '🖼️' : '📄'}</div>
                        <div className="text-[10px] truncate w-20 mx-auto text-slate-400">{doc.filename}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation / Remarks */}
              <div className="space-y-4">
                <h4 className="text-slate-500 font-bold text-sm uppercase">Activity Log</h4>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {selectedTicket.remarks?.map((rem, i) => (
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
                    onKeyDown={(e) => { if(e.key === 'Enter') handleAddRemark(); }}
                  />
                  <button 
                    onClick={handleAddRemark}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Controls */}
            <div className="space-y-6">
              <div className={`${THEME.glass} p-6 rounded-2xl`}>
                <h4 className="text-white font-bold mb-4">Status & Action</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Current Status</label>
                    <select 
                      value={tempStatus}
                      onChange={(e) => setTempStatus(e.target.value)}
                      className="w-full bg-[#0f172a] border border-white/10 text-white rounded-lg px-3 py-2 outline-none focus:border-[#ED1B2F]"
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  {tempStatus === 'resolved' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs text-emerald-400 block mb-1">Solution Description *</label>
                      <textarea 
                        value={tempSolution}
                        onChange={(e) => setTempSolution(e.target.value)}
                        className="w-full h-32 bg-[#0f172a] border border-emerald-500/30 rounded-lg p-3 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Describe how the issue was resolved..."
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${THEME.buttonPrimary} ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {updating ? 'Updating...' : 'Update Ticket'}
                  </button>
                </div>
              </div>

              <div className="bg-black/20 p-4 rounded-2xl text-xs space-y-2 text-slate-400">
                <div className="flex justify-between"><span>Priority</span> <span className="text-white capitalize">{selectedTicket.priority}</span></div>
                <div className="flex justify-between"><span>Department</span> <span className="text-white">{selectedTicket.department?.name}</span></div>
                <div className="flex justify-between"><span>Created</span> <span className="text-white">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;