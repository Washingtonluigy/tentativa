import { useState } from 'react';
import { Headphones, X } from 'lucide-react';

export default function SACPopup() {
  const [showMenu, setShowMenu] = useState(false);

  const handleSACOption = (option: 'professional' | 'doubt') => {
    const phoneNumber = '5511999999999';
    let message = '';

    if (option === 'professional') {
      message = encodeURIComponent('Olá! Meu profissional não está aqui na plataforma.');
    } else {
      message = encodeURIComponent('Olá! Estou com dúvidas sobre a plataforma.');
    }

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setShowMenu(false);
  };

  return (
    <>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="fixed bottom-24 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all z-40 hover:scale-110"
        title="SAC - Atendimento ao Cliente"
      >
        <Headphones className="w-6 h-6" />
      </button>

      {showMenu && (
        <div className="fixed bottom-40 right-6 bg-white rounded-lg shadow-xl border-2 border-blue-100 p-4 z-50 w-72">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800">Como podemos ajudar?</h3>
            <button
              onClick={() => setShowMenu(false)}
              className="p-1 hover:bg-gray-100 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleSACOption('professional')}
              className="w-full text-left p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all border border-blue-200"
            >
              <p className="font-semibold text-blue-900 text-sm">
                Meu profissional não está aqui
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Entre em contato para cadastrá-lo
              </p>
            </button>

            <button
              onClick={() => handleSACOption('doubt')}
              className="w-full text-left p-3 bg-gradient-to-r from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 rounded-lg transition-all border border-teal-200"
            >
              <p className="font-semibold text-teal-900 text-sm">
                Estou com dúvidas
              </p>
              <p className="text-xs text-teal-700 mt-1">
                Tire suas dúvidas conosco
              </p>
            </button>
          </div>
        </div>
      )}

      {showMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
