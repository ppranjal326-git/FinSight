import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Send
} from 'lucide-react';
import { fetchAnomalies, createApprovalRequest, formatCurrency } from '../api';

export default function AnomaliesTab({ onActionSubmitted }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    loadAnomalies();
  }, []);

  async function loadAnomalies() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAnomalies();
      setAnomalies(res.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFlagForApproval(anomaly) {
    try {
      setSubmittingId(anomaly.transaction_id);
      let actionType = "dispute_charge";
      let description = `Dispute transaction: ${anomaly.merchant} (₹${anomaly.amount.toLocaleString()})`;
      let impactSummary = `File chargeback dispute for ₹${anomaly.amount.toLocaleString()} on grounds of ${anomaly.risk_type.toLowerCase()}.`;

      if (anomaly.risk_type.includes("Duplicate")) {
        description = `Initiate double-charge refund request with ${anomaly.merchant}`;
        impactSummary = `Recovers duplicate debit of ₹${anomaly.amount.toLocaleString()} into checking account.`;
      } else if (anomaly.risk_type.includes("Unrecognized")) {
        description = `Freeze card and dispute unauthorized charge: ${anomaly.merchant}`;
        impactSummary = `Locks payment vector and claims ₹${anomaly.amount.toLocaleString()} unauthorized debit.`;
      }

      await createApprovalRequest({
        action_type: actionType,
        description: description,
        impact_summary: impactSummary,
        risk_level: anomaly.severity,
        payload: {
          transaction_id: anomaly.transaction_id,
          merchant: anomaly.merchant,
          amount: anomaly.amount,
          date: anomaly.date,
          reason: anomaly.reasoning
        }
      });

      setFeedbackMsg(`Successfully submitted "${anomaly.merchant}" to Human Approval Gate! Review in Actions tab.`);
      if (onActionSubmitted) onActionSubmitted();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      alert(`Error submitting request: ${err.message}`);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#C2415A]" />
            <span>Statistical Anomaly & Fraud Detection</span>
          </h2>
          <p className="text-xs text-[#667085]">
            Transactions benchmarked against a 180-day baseline per category. Flagged at &gt;2σ (Medium Risk) and &gt;3σ (High Risk) plus gateway duplicate screening.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-[#FCECEF] text-[#C2415A] border border-[#C2415A]/25 font-semibold">
            {anomalies.filter(a => a.severity === 'High').length} High Severity (&gt;3σ)
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#FFF5E5] text-[#C77A00] border border-[#C77A00]/25 font-semibold">
            {anomalies.filter(a => a.severity === 'Medium').length} Medium Severity (&gt;2σ)
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-lg bg-[#EAF7F0] border border-[#168A5B]/25 text-xs text-[#168A5B] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#168A5B] flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-[#FFFFFF] p-12 rounded-xl border border-[#E5E7EB] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#087F8C] border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#C2415A]/30 text-[#C2415A] text-sm">
          {error}
        </div>
      ) : anomalies.length === 0 ? (
        <div className="bg-[#FFFFFF] p-12 rounded-xl border border-[#E5E7EB] text-center text-[#667085]">
          <CheckCircle2 className="w-10 h-10 text-[#168A5B] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#172033]">All Clear! No anomalies detected.</p>
          <p className="text-xs text-[#667085] mt-1">Recent debits adhere strictly to standard statistical distributions.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {anomalies.map((a) => {
            const isHigh = a.severity === 'High';
            return (
              <div 
                key={a.transaction_id}
                className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] shadow-xs transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Merchant, Amount, Badge */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-[#172033]">{a.merchant}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        isHigh 
                          ? 'bg-[#FCECEF] text-[#C2415A] border-[#C2415A]/20' 
                          : 'bg-[#FFF5E5] text-[#C77A00] border-[#C77A00]/20'
                      }`}>
                        {a.severity} Severity
                      </span>
                      <span className="text-xs text-[#667085] font-medium">
                        [{a.risk_type}]
                      </span>
                      <span className="text-xs text-[#667085]">
                        • {a.date}
                      </span>
                    </div>

                    {/* Human readable reasoning */}
                    <p className="text-xs text-[#667085] leading-relaxed max-w-3xl">
                      {a.reasoning}
                    </p>

                    {/* Statistical details pill */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#667085]">
                      <span className="bg-[#F0F2EF] px-2.5 py-1 rounded border border-[#E5E7EB]">
                        Category: <strong className="text-[#172033] font-medium">{a.category}</strong>
                      </span>
                      <span className="bg-[#F0F2EF] px-2.5 py-1 rounded border border-[#E5E7EB]">
                        Baseline Mean: <strong className="text-[#172033] font-medium">₹{a.baseline_mean?.toLocaleString()}</strong>
                      </span>
                      <span className="bg-[#F0F2EF] px-2.5 py-1 rounded border border-[#E5E7EB]">
                        Std Dev (σ): <strong className="text-[#172033] font-medium">₹{a.baseline_stdev?.toLocaleString()}</strong>
                      </span>
                      <span className={`bg-[#F0F2EF] px-2.5 py-1 rounded border border-[#E5E7EB] font-bold ${
                        isHigh ? 'text-[#C2415A]' : 'text-[#C77A00]'
                      }`}>
                        Z-Score: {a.z_score}σ
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount & Submit to Human Approval Gate */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E5E7EB]">
                    <div className="text-xl font-bold text-[#C2415A]">
                      -{formatCurrency(a.amount)}
                    </div>

                    <button
                      onClick={() => handleFlagForApproval(a)}
                      disabled={submittingId === a.transaction_id}
                      className="px-3.5 py-1.5 rounded-lg bg-[#087F8C] hover:bg-[#066873] text-white text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                      title="Route to Guardrail Gate for human dispute authorization"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingId === a.transaction_id ? 'Routing...' : 'Route to Approval Gate'}</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
