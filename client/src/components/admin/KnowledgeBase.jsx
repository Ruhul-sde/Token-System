import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { THEME } from './constants';

const KnowledgeBase = ({ 
  searchQuery, 
  setSearchQuery, 
  solutionCategoryFilter, 
  setSolutionCategoryFilter, 
  copiedSolutionId, 
  setCopiedSolutionId 
}) => {
  const { getSolutions } = useAdmin();

  const copySolution = async (tokenId, solution) => {
    try {
      await navigator.clipboard.writeText(solution);
      setCopiedSolutionId(tokenId);
      setTimeout(() => setCopiedSolutionId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const solutions = getSolutions(searchQuery, solutionCategoryFilter);

  return (
    <div className="space-y-6">
      <input
        type="text"
        placeholder="Search knowledge base..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-[#1e293b] border border-[#334155] rounded-xl px-6 py-4 text-white focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent outline-none"
      />
      
      <div className="grid gap-6">
        {solutions.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <div className="text-6xl mb-4 grayscale">🔍</div>
            <p>No solutions found matching your search</p>
          </div>
        ) : (
          solutions.map(sol => (
            <div key={sol._id} className={`${THEME.glass} p-6 rounded-2xl border-l-4 border-l-emerald-500`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">{sol.title}</h3>
                  <div className="flex gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">Resolved</span>
                    {sol.category && (
                      <span className="bg-[#455185]/20 text-[#8ba0ef] text-xs px-2 py-1 rounded">
                        {sol.category}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => copySolution(sol._id, sol.solution)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copiedSolutionId === sol._id ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              
              <div className="bg-black/20 p-4 rounded-xl mb-4">
                <p className="text-red-300 text-sm mb-1 font-bold">Issue:</p>
                <p className="text-slate-300 text-sm">{sol.description}</p>
              </div>

              <div className="bg-emerald-900/10 border border-emerald-500/10 p-4 rounded-xl">
                <p className="text-emerald-400 text-sm mb-1 font-bold">Solution:</p>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{sol.solution}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;