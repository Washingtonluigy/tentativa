import { useState, useEffect, useRef } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: string;
  patient_name: string;
  patient_cpf: string;
  patient_birth_date: string;
  professional_name: string;
  professional_registration: string;
  professional_category: string;
  medications: Medication[];
  observations: string;
  diagnosis: string;
  created_at: string;
}

interface PrescriptionViewProps {
  serviceRequestId: string;
  onClose: () => void;
}

export default function PrescriptionView({ serviceRequestId, onClose }: PrescriptionViewProps) {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPrescription();
  }, []);

  const loadPrescription = async () => {
    const { data } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('service_request_id', serviceRequestId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setPrescription({
        ...data,
        medications: Array.isArray(data.medications) ? data.medications : [],
      });
    }
    setLoading(false);
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescricao Medica</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #333; }
          .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { font-size: 24px; letter-spacing: 2px; margin-bottom: 5px; }
          .header .subtitle { font-size: 14px; color: #666; }
          .prof-info { text-align: center; margin-bottom: 20px; font-size: 13px; color: #555; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #444; }
          .patient-info { display: flex; flex-wrap: wrap; gap: 15px; font-size: 13px; }
          .patient-info .field { flex: 1; min-width: 150px; }
          .patient-info .field label { font-weight: bold; color: #555; }
          .patient-info .field span { display: block; margin-top: 2px; padding: 4px 0; border-bottom: 1px dotted #999; }
          .rx-symbol { font-size: 28px; font-weight: bold; color: #333; margin: 15px 0; }
          .medication { margin-bottom: 15px; padding-left: 20px; }
          .medication .med-name { font-size: 15px; font-weight: bold; }
          .medication .med-details { font-size: 13px; color: #555; margin-top: 3px; }
          .observations { font-size: 13px; line-height: 1.6; padding: 10px; background: #f9f9f9; border-left: 3px solid #ccc; }
          .footer { margin-top: 60px; text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 300px; margin: 0 auto 5px; }
          .footer .name { font-size: 14px; font-weight: bold; }
          .footer .reg { font-size: 12px; color: #666; }
          .date { text-align: right; font-size: 12px; color: #666; margin-top: 20px; }
          .legal { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-gray-600">Carregando prescricao...</p>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Nenhuma prescricao encontrada para este atendimento.</p>
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-700 py-2 px-6 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const createdDate = new Date(prescription.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" />
            <h3 className="text-lg font-bold text-gray-900">Prescricao Medica</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-600 transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            <div ref={printRef}>
              <div className="header" style={{ textAlign: 'center', borderBottom: '3px double #333', paddingBottom: '15px', marginBottom: '15px' }}>
                <h1 style={{ fontSize: '20px', letterSpacing: '2px', marginBottom: '4px' }}>PRESCRICAO MEDICA</h1>
                <p style={{ fontSize: '12px', color: '#666' }}>Documento gerado eletronicamente</p>
              </div>

              <div className="prof-info" style={{ textAlign: 'center', marginBottom: '15px', fontSize: '12px', color: '#555' }}>
                <p><strong>{prescription.professional_name}</strong></p>
                {prescription.professional_category && <p>{prescription.professional_category}</p>}
                {prescription.professional_registration && <p>Registro: {prescription.professional_registration}</p>}
              </div>

              <div className="section" style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '1px', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', color: '#444' }}>
                  Dados do Paciente
                </div>
                <div style={{ fontSize: '12px' }}>
                  <p><strong>Nome:</strong> {prescription.patient_name}</p>
                  {prescription.patient_cpf && <p><strong>CPF:</strong> {prescription.patient_cpf}</p>}
                  {prescription.patient_birth_date && (
                    <p><strong>Data de Nascimento:</strong> {new Date(prescription.patient_birth_date).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>
              </div>

              {prescription.diagnosis && (
                <div className="section" style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '1px', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', color: '#444' }}>
                    Diagnostico / Avaliacao
                  </div>
                  <p style={{ fontSize: '12px', lineHeight: '1.6' }}>{prescription.diagnosis}</p>
                </div>
              )}

              <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>Rp.</div>

              {prescription.medications.map((med, index) => (
                <div key={index} style={{ marginBottom: '12px', paddingLeft: '15px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {index + 1}. {med.name}
                    {med.dosage && ` - ${med.dosage}`}
                  </p>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
                    {med.frequency && <p>Posologia: {med.frequency}</p>}
                    {med.duration && <p>Duracao: {med.duration}</p>}
                    {med.instructions && <p>Instrucoes: {med.instructions}</p>}
                  </div>
                </div>
              ))}

              {prescription.observations && (
                <div className="section" style={{ marginTop: '15px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '1px', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', color: '#444' }}>
                    Observacoes
                  </div>
                  <p style={{ fontSize: '12px', lineHeight: '1.6', padding: '8px', background: '#f9f9f9', borderLeft: '3px solid #ccc' }}>
                    {prescription.observations}
                  </p>
                </div>
              )}

              <div style={{ marginTop: '50px', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', width: '250px', margin: '0 auto 4px' }}></div>
                <p style={{ fontSize: '13px', fontWeight: 'bold' }}>{prescription.professional_name}</p>
                {prescription.professional_registration && (
                  <p style={{ fontSize: '11px', color: '#666' }}>Registro: {prescription.professional_registration}</p>
                )}
                {prescription.professional_category && (
                  <p style={{ fontSize: '11px', color: '#666' }}>{prescription.professional_category}</p>
                )}
              </div>

              <div className="date" style={{ textAlign: 'right', fontSize: '11px', color: '#666', marginTop: '15px' }}>
                Data: {createdDate}
              </div>

              <div style={{ textAlign: 'center', fontSize: '9px', color: '#999', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                Este documento foi gerado eletronicamente e possui validade conforme legislacao vigente.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
