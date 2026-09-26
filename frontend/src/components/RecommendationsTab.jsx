import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Info, 
  Lock, 
  Check, 
  X 
} from 'lucide-react';
import { 
  fetchRecommendations, 
  fetchApprovals, 
  createApprovalRequest, 
  approveRequest, 
  rejectRequest, 
  formatCurrency 
} from '../api';

export default function RecommendationsTab({ onActionApproved }) {
  const [recommendations, setRecommendations] = useState([]);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [recsRes, approvalsRes] = await Promise.all([
        fetchRecommendations(),
        fetchApprovals()
      ]);
      setRecommendations(recsRes.recommendations || []);
      setApprovalRequests(approvalsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForApproval(rec) {
    try {
      setSubmittingAction(rec.title);
      await createApprovalRequest({
        action_type: rec.action_type,
        description: rec.title,
        impact_summary: rec.quantified_impact,
        risk_level: rec.risk_level,
        payload: rec.payload || {}
      });

      setFeedback({
        type: 'success',
        message: `Action "${rec.title}" successfully routed to Guardrail Gate. Now pending human approval below.`
      });

      const updatedApprovals = await fetchApprovals();
      setApprovalRequests(updatedApprovals);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      alert(`Error submitting approval request: ${err.message}`);
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleApprove(id) {
    try {
      setProcessingId(id);
      const res = await approveRequest(id);
      setFeedback({
        type: 'success',
        message: `Approved Request #${id}! State mutation executed safely: ${res.execution_details?.message || res.message}`
      });

      const updatedApprovals = await fetchApprovals();
      setApprovalRequests(updatedApprovals);
      if (onActionApproved) onActionApproved();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      alert(`Approval execution failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id) {
    try {
      setProcessingId(id);
      await rejectRequest(id);
      setFeedback({
        type: 'info',
        message: `Request #${id} rejected. No accounts or financial states were modified.`
      });

      const updatedApprovals = await fetchApprovals();
      setApprovalRequests(updatedApprovals);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#087F8C]" />
            <span>AI Risk Recommendations & Human Approval Gate</span>
          </h2>
          <p className="text-xs text-[#667085]">
            Claude-generated recommendations ranked by impact-to-effort ratio. Enforced by architectural gate: zero autonomous state changes.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EAF7F0] border border-[#168A5B]/25 text-xs text-[#168A5B]">
          <ShieldCheck className="w-4 h-4 text-[#168A5B]" />
          <span className="font-semibold">Zero Autonomous State Mutation</span>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
          feedback.type === 'success' 
            ? 'bg-[#EAF7F0] border-[#168A5B]/25 text-[#168A5B]' 
            : 'bg-[#F0F2EF] border-[#E5E7EB] text-[#172033]'
        }`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1: AI Ranked Recommendations */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
          Ranked Analytical Recommendations
        </h3>

        {loading ? (
          <div className="bg-[#FFFFFF] p-12 rounded-xl border border-[#E5E7EB] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#087F8C] border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {recommendations.map((rec, idx) => {
              const needsApproval = rec.requires_approval;
              const riskColor = 
                rec.risk_level === 'High' ? 'bg-[#FCECEF] text-[#C2415A] border-[#C2415A]/20' :
                rec.risk_level === 'Medium' ? 'bg-[#FFF5E5] text-[#C77A00] border-[#C77A00]/20' :
                'bg-[#EAF7F0] text-[#168A5B] border-[#168A5B]/20';

              return (
                <div key={idx} className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] shadow-xs transition">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E6F4F2] text-[#087F8C] border border-[#087F8C]/20">
                          #{rec.priority || idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-[#172033]">{rec.title}</h4>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${riskColor}`}>
                          {rec.risk_level} Risk
                        </span>
                        {needsApproval ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FFF5E5] text-[#C77A00] border border-[#C77A00]/25 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            [NEEDS YOUR APPROVAL]
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F0F2EF] text-[#667085] border border-[#E5E7EB] flex items-center gap-1">
                            <Info className="w-2.5 h-2.5" />
                            [INFORMATIONAL ONLY]
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#667085] leading-relaxed">
                        {rec.reasoning}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                        <span className="text-[#087F8C] font-medium bg-[#E6F4F2] px-2.5 py-1 rounded border border-[#087F8C]/20">
                          🎯 Quantified Impact: {rec.quantified_impact}
                        </span>
                        {rec.monthly_savings > 0 && (
                          <span className="text-[#168A5B] font-semibold">
                            +{formatCurrency(rec.monthly_savings)}/mo savings
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E5E7EB]">
                      {needsApproval ? (
                        <button
                          onClick={() => handleSubmitForApproval(rec)}
                          disabled={submittingAction === rec.title}
                          className="px-4 py-2 rounded-lg bg-[#087F8C] hover:bg-[#066873] text-white font-semibold text-xs transition shadow-xs whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{submittingAction === rec.title ? 'Routing...' : 'Route to Approval Gate'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-[#667085] italic">Informational</span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Human-in-the-Loop Approval Queue (Active Gate) */}
      <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-[#667085] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#168A5B]" />
              <span>Guardrail Execution Queue (Audit Log)</span>
            </h3>
            <p className="text-xs text-[#667085]">
              Only actions explicitly signed off with "Approve" will execute state changes on your database.
            </p>
          </div>
          <span className="text-xs text-[#667085]">
            {approvalRequests.filter(r => r.status === 'pending').length} Action(s) Awaiting Decision
          </span>
        </div>

        <div className="space-y-3">
          {approvalRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';

            return (
              <div 
                key={req.id} 
                className={`bg-[#FFFFFF] p-4 rounded-xl border transition shadow-xs ${
                  isPending 
                    ? 'border-[#C77A00]/40' 
                    : isApproved 
                    ? 'border-[#168A5B]/30' 
                    : 'border-[#E5E7EB] opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-[#667085]">Request #{req.id}</span>
                      <h4 className="text-xs font-bold text-[#172033]">{req.description}</h4>
                      
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase border ${
                        isPending 
                          ? 'bg-[#FFF5E5] text-[#C77A00] border-[#C77A00]/25' 
                          : isApproved 
                          ? 'bg-[#EAF7F0] text-[#168A5B] border-[#168A5B]/25' 
                          : 'bg-[#FCECEF] text-[#C2415A] border-[#C2415A]/25'
                      }`}>
                        {req.status}
                      </span>

                      <span className="text-[11px] text-[#667085]">[{req.action_type}] • {req.created_at}</span>
                    </div>

                    <p className="text-xs text-[#667085]">
                      <strong className="text-[#172033]">Impact:</strong> {req.impact_summary}
                    </p>
                  </div>

                  {/* Decision Controls */}
                  <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5E7EB]">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={processingId === req.id}
                          className="px-3.5 py-1.5 rounded-lg bg-[#087F8C] hover:bg-[#066873] text-white font-semibold text-xs transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Execute</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processingId === req.id}
                          className="px-3.5 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#FCECEF] text-[#C2415A] border border-[#E5E7EB] hover:border-[#C2415A]/30 text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-[#667085] italic">
                        {isApproved ? '✓ Executed successfully' : '✗ Dismissed (no state change)'}
                      </span>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
