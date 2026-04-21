import React, { useState } from 'react';
import { LayoutDashboard, Users, Folder, UserCog, DollarSign, ClipboardList, Building2, FileText } from 'lucide-react';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { AdminDashboard } from './AdminDashboard';
import { ProfessionalManagement } from './ProfessionalManagement';
import { CategoryManagement } from './CategoryManagement';
import { ClientManagement } from './ClientManagement';
import { PlansManagement } from './PlansManagement';
import PendingApplications from './PendingApplications';
import NetworkManagement from './NetworkManagement';
import NetworkReports from './NetworkReports';

export function AdminModule() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [networksSubTab, setNetworksSubTab] = useState<'manage' | 'reports'>('manage');

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard' },
    { icon: ClipboardList, label: 'Cadastros', value: 'applications' },
    { icon: Building2, label: 'Redes', value: 'networks' },
    { icon: Folder, label: 'Categorias', value: 'categories' },
    { icon: UserCog, label: 'Profissionais', value: 'professionals' },
    { icon: Users, label: 'Clientes', value: 'clients' },
    { icon: DollarSign, label: 'Planos', value: 'plans' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'applications':
        return <PendingApplications />;
      case 'networks':
        return (
          <>
            <div className="flex gap-1 px-4 pt-3 pb-1">
              <button
                onClick={() => setNetworksSubTab('manage')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  networksSubTab === 'manage'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Gerenciar
              </button>
              <button
                onClick={() => setNetworksSubTab('reports')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  networksSubTab === 'reports'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Relatórios
              </button>
            </div>
            {networksSubTab === 'manage' ? <NetworkManagement /> : <NetworkReports />}
          </>
        );
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
