import React, { useState } from 'react';
import { Users, FileText, MessageCircle, MapPin, History, DollarSign, Home } from 'lucide-react';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { ProfessionalList } from './ProfessionalList';
import { RequestService } from './RequestService';
import { MyRequests } from './MyRequests';
import { GPSTracking } from './GPSTracking';
import { AppointmentHistory } from './AppointmentHistory';
import { PlansView } from './PlansView';
import { ClientProfile } from './ClientProfile';
import { MyCity } from './MyCity';
import Messages from './Messages';

export function ClientModule() {
  const [activeTab, setActiveTab] = useState('professionals');
  const [selectedProfessional, setSelectedProfessional] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedChatProfessionalId, setSelectedChatProfessionalId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const navItems = [
    { icon: Users, label: 'Profiss.', value: 'professionals' },
    { icon: FileText, label: 'Chamad.', value: 'requests' },
    { icon: MessageCircle, label: 'Chat', value: 'conversations' },
    { icon: DollarSign, label: 'Planos', value: 'plans' },
    { icon: Home, label: 'Minha Cidade', value: 'my-city' },
    { icon: MapPin, label: 'GPS', value: 'gps' },
    { icon: History, label: 'Histórico', value: 'history' },
  ];

  const handleRequestService = (professionalId: string, professionalName: string) => {
    setSelectedProfessional({ id: professionalId, name: professionalName });
  };

  const handleBackToProfessionals = () => {
    setSelectedProfessional(null);
  };

  const handleRequestSuccess = () => {
    setSelectedProfessional(null);
    setActiveTab('requests');
  };

  const handleOpenChat = (professionalId: string) => {
    setSelectedChatProfessionalId(professionalId);
    setActiveTab('conversations');
  };

  const renderContent = () => {
    if (selectedProfessional) {
      return (
        <RequestService
          professionalId={selectedProfessional.id}
          professionalName={selectedProfessional.name}
          onBack={handleBackToProfessionals}
          onSuccess={handleRequestSuccess}
        />
      );
    }

    switch (activeTab) {
      case 'professionals':
        return <ProfessionalList onRequestService={handleRequestService} />;
      case 'requests':
        return <MyRequests onOpenChat={handleOpenChat} />;
      case 'conversations':
        return <Messages selectedProfessionalId={selectedChatProfessionalId} />;
      case 'plans':
        return <PlansView />;
      case 'my-city':
        return <MyCity />;
      case 'gps':
        return <GPSTracking />;
      case 'history':
        return <AppointmentHistory />;
      default:
        return <ProfessionalList onRequestService={handleRequestService} />;
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #f5e6d3 0%, #fef9f3 50%, #fffdf9 100%)'
    }}>
      <Header
        title="Cliente"
        onNameClick={() => setShowProfile(true)}
      />
      <div className="max-w-lg mx-auto">
        {renderContent()}
      </div>
      <BottomNav items={navItems} activeTab={activeTab} onTabChange={setActiveTab} />

      {showProfile && (
        <ClientProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
