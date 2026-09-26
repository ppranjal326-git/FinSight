import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardTab from './components/DashboardTab';
import ForecastTab from './components/ForecastTab';
import AnomaliesTab from './components/AnomaliesTab';
import RecurringTab from './components/RecurringTab';
import SimulatorTab from './components/SimulatorTab';
import RecommendationsTab from './components/RecommendationsTab';
import GoalsTab from './components/GoalsTab';
import TransactionsTab from './components/TransactionsTab';
import { fetchDashboard, resetMockData } from './api';
import { ShieldCheck } from 'lucide-react';
import ChatBot from './components/ChatBot';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const data = await fetchDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetData() {
    if (!window.confirm("Reset all accounts, goals, and 6 months of transactions to initial hackathon baseline?")) {
      return;
    }
    try {
      setIsResetting(true);
      await resetMockData();
      await loadDashboard();
      alert("Database reset to 6-month realistic baseline with anomalies & sample approval requests!");
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7F4] text-[#172033] flex flex-col font-sans selection:bg-[#E6F4F2] selection:text-[#087F8C]">
      
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalBalance={dashboardData?.total_liquid_balance}
        pendingApprovalsCount={dashboardData?.pending_approvals_count}
        onResetData={handleResetData}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            dashboardData={dashboardData}
            setActiveTab={setActiveTab}
            onRefresh={loadDashboard}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastTab />
        )}

        {activeTab === 'anomalies' && (
          <AnomaliesTab
            onActionSubmitted={loadDashboard}
          />
        )}

        {activeTab === 'recurring' && (
          <RecurringTab
            onActionSubmitted={loadDashboard}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorTab />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab
            onActionApproved={loadDashboard}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsTab
            onActionSubmitted={loadDashboard}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab />
        )}
      </main>

      {/* Professional Footer */}
      <footer className="mt-auto bg-[#FFFFFF] border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">

            {/* Left — Brand + tagline */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
              <span className="text-[13px] font-semibold text-[#172033] tracking-tight whitespace-nowrap">
                FinSight Financial Intelligence
              </span>
              <span className="hidden sm:inline text-[#D1D5DB] text-[13px]">&middot;</span>
              <span className="text-[12px] text-[#667085]">
                AI-Powered Financial Risk &amp; Cash Flow Intelligence
              </span>
            </div>

            {/* Center — Live guardrail status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="text-[11.5px] font-medium text-[#15803D] whitespace-nowrap">
                Human-in-the-Loop Guardrail: Active
              </span>
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#16A34A', flexShrink: 0,
                animation: 'fpulse 2.2s ease-in-out infinite',
              }} />
            </div>

            {/* Right — Links + version */}
            <div className="flex items-center gap-3 text-[12px] text-[#9CA3AF]">
              {['Privacy', 'Security', 'Help'].map((label, i, arr) => (
                <React.Fragment key={label}>
                  <button type="button" className="hover:text-[#087F8C] transition-colors duration-150 bg-transparent border-none p-0 font-[inherit] text-inherit cursor-pointer">
                    {label}
                  </button>
                  {i < arr.length - 1 && <span className="text-[#E5E7EB]">&middot;</span>}
                </React.Fragment>
              ))}
              <span className="text-[#E5E7EB]">&middot;</span>
              <span className="font-mono text-[11px] text-[#C3C9D4] tracking-wide">v1.0</span>
            </div>
          </div>
        </div>
        <style>{`@keyframes fpulse{0%,100%{box-shadow:0 0 0 2px rgba(22,163,74,.2)}50%{box-shadow:0 0 0 5px rgba(22,163,74,.07)}}`}</style>
      </footer>

      {/* AI Floating Chatbot */}
      <ChatBot />

    </div>
  );
}
