import React from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Sliders, 
  Target, 
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../api';
import Logo from './Logo';

export default function Navbar({ activeTab, setActiveTab, totalBalance, pendingApprovalsCount, onResetData, isResetting }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'forecast', label: 'Cash Flow Forecast', icon: TrendingUp },
    { id: 'anomalies', label: 'Anomalies & Alerts', icon: AlertTriangle, badge: 'Live' },
    { id: 'recurring', label: 'Recurring & Bills', icon: RefreshCw },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
    { id: 'recommendations', label: 'AI Actions & Approvals', icon: Sparkles, badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Pending` : null },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'transactions', label: 'Transactions', icon: FileText }
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFFF] border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <Logo size="md" showText={true} />
            <div className="hidden sm:block h-4 w-px bg-[#E5E7EB]" />
            <span className="hidden sm:inline-block text-xs text-[#667085] font-medium">
              Financial Risk Intelligence
            </span>
          </div>

          {/* Center: Clean Architectural Guardrail Gate Status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md bg-[#EAF7F0] border border-[#168A5B]/20 text-xs text-[#168A5B]">
            <ShieldCheck className="w-4 h-4 text-[#168A5B] flex-shrink-0" />
            <span className="font-semibold">Guardrail Gate: ENFORCED</span>
            <span className="text-[#667085] text-[11px]">— Human-in-the-loop required for state mutations</span>
          </div>

          {/* Right Side: Total Balance & Reset */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] font-medium text-[#667085]">Total Liquid Reserves</div>
              <div className="text-lg font-bold text-[#172033] tracking-tight">
                {totalBalance ? formatCurrency(totalBalance) : '₹0'}
              </div>
            </div>

            <button
              onClick={onResetData}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F0F2EF] border border-[#E5E7EB] text-xs font-medium text-[#172033] transition disabled:opacity-50"
              title="Reset 6-month simulation dataset"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#667085] ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Clean Minimal Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-[#E5E7EB]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E6F4F2] text-[#087F8C] font-semibold'
                    : 'text-[#667085] hover:text-[#172033] hover:bg-[#F0F2EF]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#087F8C]' : 'text-[#667085]'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    tab.id === 'anomalies'
                      ? 'bg-[#FCECEF] text-[#C2415A]'
                      : 'bg-[#FFF5E5] text-[#C77A00]'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
