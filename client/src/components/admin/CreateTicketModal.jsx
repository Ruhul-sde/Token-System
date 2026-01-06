import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { THEME } from './constants';

const CreateTicketModal = ({ 
  showCreateModal, 
  setShowCreateModal 
}) => {
  const { departments, createTicketOnBehalf } = useAdmin();
  const { API_URL } = useAuth();
  
  const [newTicket, setNewTicket] = useState({
    title: '', 
    description: '', 
    priority: 'medium', 
    department: '',
    category: '',
    reason: '',
    userDetails: { 
      name: '', 
      email: '',
      employeeCode: '',
      companyName: ''
    }
  });
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!newTicket.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!newTicket.description.trim()) {
      setError('Description is required');
      return;
    }
    if (!newTicket.department) {
      setError('Please select a department');
      return;
    }
    if (!newTicket.userDetails.name.trim() || !newTicket.userDetails.email.trim()) {
      setError('User name and email are required');
      return;
    }

    try {
      setCreating(true);
      
      // Prepare data matching backend structure
      const ticketData = {
        title: newTicket.title.trim(),
        description: newTicket.description.trim(),
        priority: newTicket.priority,
        department: newTicket.department,
        category: newTicket.category.trim() || undefined,
        reason: newTicket.reason.trim() || undefined,
        supportingDocuments: [], // Empty array as we're not handling file uploads in this modal
        userDetails: {
          name: newTicket.userDetails.name.trim(),
          email: newTicket.userDetails.email.trim(),
          employeeCode: newTicket.userDetails.employeeCode.trim() || undefined,
          companyName: newTicket.userDetails.companyName.trim() || undefined
        }
      };

      console.log('Creating ticket with data:', ticketData);
      await createTicketOnBehalf(ticketData);
      
      // Reset form and close modal
      setNewTicket({
        title: '', 
        description: '', 
        priority: 'medium', 
        department: '',
        category: '',
        reason: '',
        userDetails: { 
          name: '', 
          email: '',
          employeeCode: '',
          companyName: ''
        }
      });
      
      setShowCreateModal(false);
      alert('Ticket created successfully!');
      
    } catch (error) {
      console.error('Ticket creation failed:', error);
      setError(error.message || 'Failed to create ticket. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    // Note: This is a placeholder for file upload functionality
    // You'll need to implement actual file upload logic
    console.log('Files selected:', files);
    // For now, we're not handling file uploads in this simplified version
  };

  if (!showCreateModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
      <div className="bg-[#1e293b] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10 flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Create New Ticket on Behalf</h3>
          <button 
            onClick={() => setShowCreateModal(false)} 
            className="text-slate-400 hover:text-white transition-colors"
            type="button"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* User Information */}
          <div className="space-y-4">
            <h4 className="text-slate-300 font-medium">User Information</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <input 
                  required 
                  placeholder="User Name *" 
                  value={newTicket.userDetails.name} 
                  onChange={e => setNewTicket({
                    ...newTicket, 
                    userDetails: {...newTicket.userDetails, name: e.target.value}
                  })} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F]"
                />
              </div>
              <div>
                <input 
                  required 
                  placeholder="User Email *" 
                  type="email" 
                  value={newTicket.userDetails.email} 
                  onChange={e => setNewTicket({
                    ...newTicket, 
                    userDetails: {...newTicket.userDetails, email: e.target.value}
                  })} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F]"
                />
              </div>
              <div>
                <input 
                  placeholder="Employee Code (Optional)" 
                  value={newTicket.userDetails.employeeCode} 
                  onChange={e => setNewTicket({
                    ...newTicket, 
                    userDetails: {...newTicket.userDetails, employeeCode: e.target.value}
                  })} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#455185]"
                />
              </div>
              <div>
                <input 
                  placeholder="Company Name (Optional)" 
                  value={newTicket.userDetails.companyName} 
                  onChange={e => setNewTicket({
                    ...newTicket, 
                    userDetails: {...newTicket.userDetails, companyName: e.target.value}
                  })} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#455185]"
                />
              </div>
            </div>
          </div>

          {/* Ticket Information */}
          <div className="space-y-4">
            <h4 className="text-slate-300 font-medium">Ticket Information</h4>
            
            <input 
              required 
              placeholder="Ticket Title *" 
              value={newTicket.title} 
              onChange={e => setNewTicket({...newTicket, title: e.target.value})} 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F] font-bold"
            />
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1 ml-1">Department *</label>
                <select 
                  required
                  value={newTicket.department} 
                  onChange={e => setNewTicket({...newTicket, department: e.target.value})} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F]"
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs text-slate-400 block mb-1 ml-1">Priority *</label>
                <select 
                  value={newTicket.priority} 
                  onChange={e => setNewTicket({...newTicket, priority: e.target.value})} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F]"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <input 
                  placeholder="Category (Optional)" 
                  value={newTicket.category} 
                  onChange={e => setNewTicket({...newTicket, category: e.target.value})} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#455185]"
                />
              </div>
              <div>
                <input 
                  placeholder="Reason (Optional)" 
                  value={newTicket.reason} 
                  onChange={e => setNewTicket({...newTicket, reason: e.target.value})} 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#455185]"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 block mb-1 ml-1">Description *</label>
              <textarea 
                required 
                placeholder="Describe the issue in detail..." 
                value={newTicket.description} 
                onChange={e => setNewTicket({...newTicket, description: e.target.value})} 
                className="w-full h-40 bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F] resize-none"
                rows="4"
              />
            </div>

            {/* File Upload - Optional */}
            {/* <div>
              <label className="text-xs text-slate-400 block mb-1 ml-1">Attachments (Optional)</label>
              <div className="border border-dashed border-white/10 rounded-xl p-4 text-center hover:border-white/20 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <div className="text-2xl mb-2">📎</div>
                  <div className="text-sm">Click to upload files (images, PDFs, documents)</div>
                  <div className="text-xs mt-1">Max 10MB per file</div>
                </label>
              </div>
            </div> */}
          </div>
          
          {/* Action Buttons */}
          <div className="border-t border-white/10 pt-6 flex justify-between items-center">
            <div className="text-xs text-slate-500">
              Fields marked with * are required
            </div>
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)} 
                className="px-6 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={creating}
                className={`px-8 py-2 rounded-xl font-bold ${THEME.buttonPrimary} ${creating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Creating...
                  </span>
                ) : 'Create Ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;