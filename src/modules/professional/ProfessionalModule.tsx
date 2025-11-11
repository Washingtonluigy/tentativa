import React, { useState } from 'react';
import { LayoutDashboard, Briefcase, Bell, MessageCircle, Calendar, MapPin } from 'lucide-react';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { ProfessionalDashboard } from './ProfessionalDashboard';
import { ServiceManagement } from './ServiceManagement';
import { ServiceRequests } from './ServiceRequests';
import Messages from './Messages';
import { Schedule } from './Schedule';
import GPSTracking from './GPSTracking';

export function ProfessionalModule() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard' },
    { icon: Briefcase, label: 'Serviços', value: 'services' },
    { icon: Bell, label: 'Chamados', value: 'requests' },
    { icon: Calendar, label: 'Agenda', value: 'schedule' },
    { icon: MapPin, label: 'GPS', value: 'gps' },
    { icon: MessageCircle, label: 'Conversas', value: 'conversations' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProfessionalDashboard />;
      case 'services':
        return <ServiceManagement />;
      case 'requests':
        return <ServiceRequests />;
      case 'schedule':
        return <Schedule />;
      case 'gps':
        return <GPSTracking />;
      case 'conversations':
        return <Messages />;
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
