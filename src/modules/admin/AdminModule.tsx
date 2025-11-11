import React, { useState } from 'react';
import { LayoutDashboard, Users, Folder, UserCog, DollarSign } from 'lucide-react';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { AdminDashboard } from './AdminDashboard';
import { ProfessionalManagement } from './ProfessionalManagement';
import { CategoryManagement } from './CategoryManagement';
import { ClientManagement } from './ClientManagement';
import { PlansManagement } from './PlansManagement';

export function AdminModule() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard' },
    { icon: Folder, label: 'Categorias', value: 'categories' },
    { icon: UserCog, label: 'Profissionais', value: 'professionals' },
    { icon: Users, label: 'Clientes', value: 'clients' },
    { icon: DollarSign, label: 'Planos', value: 'plans' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'professionals':
        return <ProfessionalManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'clients':
        return <ClientManagement />;
      case 'plans':
        return <PlansManagement />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Admin" />
      <div className="max-w-lg mx-auto">
        {renderContent()}
      </div>
      <BottomNav items={navItems} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
