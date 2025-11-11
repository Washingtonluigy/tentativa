import React, { useState } from 'react';
import { LayoutDashboard, Briefcase, Bell, MessageCircle, History } from 'lucide-react';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { ProfessionalDashboard } from './ProfessionalDashboard';
import { ServiceManagement } from './ServiceManagement';
import { ServiceRequests } from './ServiceRequests';
import Messages from './Messages';

export function ProfessionalModule() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard' },
    { icon: Briefcase, label: 'Serviços', value: 'services' },
    { icon: Bell, label: 'Chamados', value: 'requests' },
    { icon: MessageCircle, label: 'Conversas', value: 'conversations' },
    { icon: History, label: 'Histórico', value: 'history' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProfessionalDashboard />;
      case 'services':
        return <ServiceManagement />;
      case 'requests':
        return <ServiceRequests />;
      case 'conversations':
        return <Messages />;
      case 'history':
        return <div className="p-4 pb-20"><h2 className="text-2xl font-bold">Histórico</h2><p className="text-gray-600 mt-4">Em desenvolvimento</p></div>;
      default:
        return <ProfessionalDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Profissional" />
      <div className="max-w-lg mx-auto">
        {renderContent()}
      </div>
      <BottomNav items={navItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
