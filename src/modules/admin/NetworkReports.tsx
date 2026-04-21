import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, FileText, Users, UserCog, Download, Filter, ChevronDown } from 'lucide-react';

interface Network {
  id: string;
  name: string;
  logo_url?: string;
}

interface UserRef {
  id: string;
  full_name: string;
  email: string;
}

interface ReportRecord {
  id: string;
  record_type: string;
  title: string;
  content: string;
  created_at: string;
  service_request_id: string | null;
  client_id: string;
  client_name: string;
  client_email: string;
  professional_id: string;
  professional_name: string;
  professional_email: string;
  call_started_at?: string;
  call_ended_at?: string;
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  exam: 'Exame',
  prescription: 'Receita',
  diagnosis: 'Diagnóstico',
  treatment: 'Tratamento',
  note: 'Observação',
};

function fmt(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function generatePDF(networkName: string, reportType: string, records: ReportRecord[], filterLabel: string) {
  const now = new Date().toLocaleString('pt-BR');
  const reportTitles: Record<string, string> = {
    professional: 'Relatório por Profissional',
    client: 'Relatório por Cliente',
    complete: 'Relatório Completo',
  };

  let body = '';

  if (reportType === 'professional') {
    const grouped = groupBy(records, 'professional_id');
    for (const profId of Object.keys(grouped)) {
      const group = grouped[profId];
      const prof = group[0];
      body += `
        <div class="group">
          <h2>Profissional: ${prof.professional_name}</h2>
          <p class="sub">E-mail: ${prof.professional_email} &nbsp;|&nbsp; Total de atendimentos: <strong>${group.length}</strong></p>
          <table>
            <thead><tr>
              <th>Cliente</th><th>Tipo de Registro</th><th>Data/Hora do Chamado</th><th>Data/Hora da Finalização</th>
            </tr></thead>
            <tbody>
              ${group.map(r => `<tr>
                <td>${r.client_name}<br><small>${r.client_email}</small></td>
                <td>${RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}</td>
                <td>${fmt(r.call_started_at)}</td>
                <td>${fmt(r.call_ended_at)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }
  } else if (reportType === 'client') {
    const grouped = groupBy(records, 'client_id');
    for (const clientId of Object.keys(grouped)) {
      const group = grouped[clientId];
      const cli = group[0];
      body += `
        <div class="group">
          <h2>Cliente: ${cli.client_name}</h2>
          <p class="sub">E-mail: ${cli.client_email} &nbsp;|&nbsp; Total de atendimentos: <strong>${group.length}</strong></p>
          <table>
            <thead><tr>
              <th>Profissional</th><th>Tipo de Registro</th><th>Data/Hora do Chamado</th><th>Data/Hora da Finalização</th>
            </tr></thead>
            <tbody>
              ${group.map(r => `<tr>
                <td>${r.professional_name}<br><small>${r.professional_email}</small></td>
                <td>${RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}</td>
                <td>${fmt(r.call_started_at)}</td>
                <td>${fmt(r.call_ended_at)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }
  } else {
    // complete
    const byProf = groupBy(records, 'professional_id');
    for (const profId of Object.keys(byProf)) {
      const profRecords = byProf[profId];
      const prof = profRecords[0];
      body += `<div class="group"><h2>Profissional: ${prof.professional_name} &mdash; ${prof.professional_email}</h2>`;
      const byClient = groupBy(profRecords, 'client_id');
      for (const clientId of Object.keys(byClient)) {
        const clientRecords = byClient[clientId];
        const cli = clientRecords[0];
        body += `<h3>Cliente: ${cli.client_name} &mdash; ${cli.client_email}</h3>
          <p class="sub">Total de atendimentos: <strong>${clientRecords.length}</strong></p>`;
        for (const r of clientRecords) {
          body += `
            <div class="record-card">
              <div class="record-header">
                <span class="badge">${RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}</span>
                <span class="record-title">${r.title}</span>
              </div>
              <div class="record-dates">
                Chamado: ${fmt(r.call_started_at)} &nbsp;|&nbsp; Finalização: ${fmt(r.call_ended_at)}
                &nbsp;|&nbsp; Ficha criada: ${fmt(r.created_at)}
              </div>
              <div class="record-content">${r.content.replace(/\n/g, '<br>')}</div>
            </div>`;
        }
      }
      body += `</div>`;
    }
  }

  if (!body) body = '<p style="color:#999;text-align:center;margin-top:40px">Nenhum registro encontrado para os filtros selecionados.</p>';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${reportTitles[reportType]} - ${networkName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #222; padding: 24px; }
    .report-header { border-bottom: 3px solid #1a56db; padding-bottom: 12px; margin-bottom: 20px; }
    .report-header h1 { font-size: 20px; color: #1a56db; }
    .report-header .meta { color: #555; font-size: 10px; margin-top: 4px; }
    .group { margin-bottom: 28px; page-break-inside: avoid; }
    h2 { font-size: 13px; background: #1a56db; color: white; padding: 6px 10px; border-radius: 4px; margin-bottom: 6px; }
    h3 { font-size: 12px; background: #e8f0fe; color: #1a3a7c; padding: 5px 10px; margin: 10px 0 4px; border-left: 3px solid #1a56db; }
    .sub { color: #555; font-size: 10px; margin-bottom: 8px; padding-left: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #374151; color: white; padding: 5px 8px; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    td small { color: #888; }
    .record-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; margin-bottom: 8px; }
    .record-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .badge { background: #dbeafe; color: #1e40af; font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 600; }
    .record-title { font-weight: 600; font-size: 11px; }
    .record-dates { color: #6b7280; font-size: 9px; margin-bottom: 6px; }
    .record-content { font-size: 10px; color: #374151; background: white; border: 1px solid #e5e7eb; padding: 8px; border-radius: 3px; white-space: pre-wrap; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${reportTitles[reportType]}</h1>
    <div class="meta">
      Convênio: <strong>${networkName}</strong>
      ${filterLabel ? `&nbsp;|&nbsp; Filtro: <strong>${filterLabel}</strong>` : ''}
      &nbsp;|&nbsp; Gerado em: ${now}
    </div>
  </div>
  ${body}
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Permita pop-ups para exportar o PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export default function NetworkReports() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [reportType, setReportType] = useState<'professional' | 'client' | 'complete'>('professional');
  const [filterPersonId, setFilterPersonId] = useState('');
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [professionals, setProfessionals] = useState<UserRef[]>([]);
  const [clients, setClients] = useState<UserRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('healthcare_networks').select('id, name, logo_url').eq('active', true).then(({ data }) => {
      setNetworks(data ?? []);
    });
  }, []);

  useEffect(() => {
    setFilterPersonId('');
    setRecords([]);
    setProfessionals([]);
    setClients([]);
    if (selectedNetworkId) loadNetworkData(selectedNetworkId);
  }, [selectedNetworkId]);

  useEffect(() => {
    setFilterPersonId('');
  }, [reportType]);

  async function loadNetworkData(networkId: string) {
    setLoading(true);

    const [profNetworks, clientNetworks, medRecords] = await Promise.all([
      supabase.from('professional_networks').select('professional_id').eq('network_id', networkId).eq('active', true),
      supabase.from('client_networks').select('client_id').eq('network_id', networkId).eq('active', true),
      supabase.from('medical_records').select('id, record_type, title, content, created_at, service_request_id, client_id, professional_id').eq('network_id', networkId).order('created_at', { ascending: false }),
    ]);

    const profIds = (profNetworks.data ?? []).map(p => p.professional_id);
    const clientIds = (clientNetworks.data ?? []).map(c => c.client_id);

    const [profsData, clientsData] = await Promise.all([
      profIds.length > 0
        ? supabase.from('users').select('id, full_name, email').in('id', profIds)
        : Promise.resolve({ data: [] }),
      clientIds.length > 0
        ? supabase.from('users').select('id, full_name, email').in('id', clientIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profMap: Record<string, UserRef> = {};
    (profsData.data ?? []).forEach(u => { profMap[u.id] = u; });

    const clientMap: Record<string, UserRef> = {};
    (clientsData.data ?? []).forEach(u => { clientMap[u.id] = u; });

    setProfessionals(profsData.data ?? []);
    setClients(clientsData.data ?? []);

    const rawRecords = medRecords.data ?? [];
    if (rawRecords.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    // Fetch service_requests for records that have service_request_id
    const srIds = rawRecords.map(r => r.service_request_id).filter(Boolean) as string[];
    let srMap: Record<string, { created_at: string; completed_at?: string }> = {};
    if (srIds.length > 0) {
      const { data: srs } = await supabase.from('service_requests').select('id, created_at, completed_at').in('id', srIds);
      (srs ?? []).forEach(sr => { srMap[sr.id] = sr; });
    }

    const builtRecords: ReportRecord[] = rawRecords.map(r => {
      const sr = r.service_request_id ? srMap[r.service_request_id] : null;
      const prof = profMap[r.professional_id] ?? { id: r.professional_id, full_name: 'Desconhecido', email: '' };
      const cli = clientMap[r.client_id] ?? { id: r.client_id, full_name: 'Desconhecido', email: '' };
      return {
        id: r.id,
        record_type: r.record_type,
        title: r.title,
        content: r.content,
        created_at: r.created_at,
        service_request_id: r.service_request_id,
        client_id: r.client_id,
        client_name: cli.full_name,
        client_email: cli.email,
        professional_id: r.professional_id,
        professional_name: prof.full_name,
        professional_email: prof.email,
        call_started_at: sr?.created_at,
        call_ended_at: sr?.completed_at,
      };
    });

    setRecords(builtRecords);
    setLoading(false);
  }

  const filteredRecords = records.filter(r => {
    if (!filterPersonId) return true;
    if (reportType === 'professional') return r.professional_id === filterPersonId;
    if (reportType === 'client') return r.client_id === filterPersonId;
    return true;
  });

  const selectedNetwork = networks.find(n => n.id === selectedNetworkId);

  function handleExport() {
    if (!selectedNetwork) return;
    let filterLabel = '';
    if (filterPersonId) {
      if (reportType === 'professional') {
        filterLabel = professionals.find(p => p.id === filterPersonId)?.full_name ?? '';
      } else if (reportType === 'client') {
        filterLabel = clients.find(c => c.id === filterPersonId)?.full_name ?? '';
      }
    }
    generatePDF(selectedNetwork.name, reportType, filteredRecords, filterLabel);
  }

  const groupedForPreview = reportType === 'professional'
    ? groupBy(filteredRecords, 'professional_id')
    : groupBy(filteredRecords, 'client_id');

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-bold text-gray-800">Relatórios de Convênios</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Convênio</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedNetworkId}
              onChange={e => setSelectedNetworkId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Selecione um convênio</option>
              {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
        </div>

        {selectedNetworkId && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Relatório</label>
              <div className="flex gap-2">
                {[
                  { value: 'professional', label: 'Por Profissional', icon: UserCog },
                  { value: 'client', label: 'Por Cliente', icon: Users },
                  { value: 'complete', label: 'Completo', icon: FileText },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReportType(opt.value as typeof reportType)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium border transition ${
                      reportType === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {reportType !== 'complete' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  {reportType === 'professional' ? 'Filtrar por Profissional' : 'Filtrar por Cliente'} (opcional)
                </label>
                <div className="relative">
                  <select
                    value={filterPersonId}
                    onChange={e => setFilterPersonId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="">Todos</option>
                    {(reportType === 'professional' ? professionals : clients).map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export button */}
      {selectedNetworkId && (
        <button
          onClick={handleExport}
          disabled={loading || filteredRecords.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          <Download className="w-4 h-4" />
          {loading ? 'Carregando...' : `Exportar PDF (${filteredRecords.length} registro${filteredRecords.length !== 1 ? 's' : ''})`}
        </button>
      )}

      {/* Preview */}
      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">Carregando dados...</div>
      )}

      {!loading && selectedNetworkId && filteredRecords.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Nenhum registro encontrado para os filtros selecionados.
        </div>
      )}

      {!loading && filteredRecords.length > 0 && reportType !== 'complete' && (
        <div className="space-y-3">
          {Object.entries(groupedForPreview).map(([personId, personRecords]) => {
            const first = personRecords[0];
            const name = reportType === 'professional' ? first.professional_name : first.client_name;
            const email = reportType === 'professional' ? first.professional_email : first.client_email;
            return (
              <div key={personId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{name}</p>
                    <p className="text-xs text-gray-500">{email}</p>
                  </div>
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {personRecords.length} atend.
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {personRecords.slice(0, 5).map(r => (
                    <div key={r.id} className="px-4 py-2 text-xs flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs mr-2">
                          {RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}
                        </span>
                        <span className="font-medium text-gray-700">{reportType === 'professional' ? r.client_name : r.professional_name}</span>
                      </div>
                      <span className="text-gray-400 whitespace-nowrap">{fmt(r.created_at)}</span>
                    </div>
                  ))}
                  {personRecords.length > 5 && (
                    <p className="px-4 py-2 text-xs text-gray-400">+ {personRecords.length - 5} mais registros no PDF</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredRecords.length > 0 && reportType === 'complete' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Resumo do relatório completo</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{Object.keys(groupBy(filteredRecords, 'professional_id')).length}</p>
              <p className="text-xs text-gray-600">Profissionais</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{Object.keys(groupBy(filteredRecords, 'client_id')).length}</p>
              <p className="text-xs text-gray-600">Clientes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center col-span-2">
              <p className="text-2xl font-bold text-gray-700">{filteredRecords.length}</p>
              <p className="text-xs text-gray-600">Total de Fichas de Atendimento</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">O PDF completo inclui o conteúdo de cada ficha de atendimento.</p>
        </div>
      )}
    </div>
  );
}
