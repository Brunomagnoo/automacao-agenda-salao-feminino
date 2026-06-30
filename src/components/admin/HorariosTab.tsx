import { useEffect, useState, useCallback } from 'react';
import { formatLocalDate } from '@/lib/utils';

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function HorariosTab({ isAuthed }: { isAuthed: boolean }) {
  const [slotsDate, setSlotsDate] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');

  useEffect(() => {
    setSlotsDate(formatLocalDate());
  }, []);

  const fetchSlots = useCallback(async () => {
    if (!slotsDate) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/admin/timeslots?date=${slotsDate}`);
      if (res.ok) setSlots(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  }, [slotsDate]);

  useEffect(() => {
    if (isAuthed && slotsDate) fetchSlots();
  }, [isAuthed, slotsDate, fetchSlots]);

  const generateSlots = async () => {
    if (!slotsDate) {
      setSlotsMessage('Selecione uma data.');
      return;
    }
    const dayOfWeek = new Date(slotsDate + 'T12:00:00').getDay();
    if (dayOfWeek === 0 || dayOfWeek === 1) {
      setSlotsMessage('Horários apenas de Terça a Sábado.');
      return;
    }
    const slotsArray: { startTime: string; endTime: string }[] = [];
    let startMin = 13 * 60 + 30; // 13:30
    while (startMin <= 19 * 60 + 30) {
      const sH = Math.floor(startMin / 60),
        sM = startMin % 60;
      const eH = Math.floor((startMin + 30) / 60),
        eM = (startMin + 30) % 60;
      slotsArray.push({
        startTime: `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`,
        endTime: `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`,
      });
      startMin += 30;
    }
    try {
      const res = await fetch('/api/admin/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: slotsDate, slots: slotsArray }),
      });
      if (res.ok) {
        const data = await res.json();
        setSlotsMessage(`${data.created} criados, ${data.skipped} existentes.`);
        fetchSlots();
      } else {
        setSlotsMessage('Erro ao gerar horários.');
      }
    } catch {
      setSlotsMessage('Erro ao gerar horários.');
    }
  };

  const deleteAvailableSlots = async () => {
    if (!slotsDate) return;
    try {
      const res = await fetch(`/api/admin/timeslots?date=${slotsDate}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setSlotsMessage(`${data.deleted} horários removidos.`);
        fetchSlots();
      }
    } catch {
      setSlotsMessage('Erro ao remover.');
    }
  };

  return (
    <div className="adm-section fade-in">
      <div className="adm-section__header">
        <h2>Gerenciar Horários</h2>
      </div>

      <div className="adm-filters">
        <div className="adm-filter">
          <label>Data</label>
          <input
            type="date"
            value={slotsDate}
            onChange={(e) => {
              setSlotsDate(e.target.value);
              setSlotsMessage('');
            }}
          />
        </div>
        <button className="adm-btn adm-btn--primary" onClick={generateSlots}>
          Gerar Horários
        </button>
        {slots.length > 0 && (
          <button className="adm-btn adm-btn--cancel" onClick={deleteAvailableSlots}>
            Limpar Disponíveis
          </button>
        )}
      </div>

      {slotsMessage && <div className="adm-alert">{slotsMessage}</div>}

      {loadingSlots ? (
        <div className="adm-loading">
          <div className="adm-loading__spinner" />
        </div>
      ) : slotsDate && slots.length > 0 ? (
        <>
          <p className="adm-slots-info">
            {slots.filter((s) => s.isAvailable).length} disponíveis de {slots.length} total
          </p>
          <div className="adm-slots-grid">
            {slots.map((slot) => (
              <div key={slot.id} className={`adm-slot${!slot.isAvailable ? ' adm-slot--busy' : ''}`}>
                <span className="adm-slot__time">{slot.startTime}</span>
                <span className={`adm-slot__status${slot.isAvailable ? ' adm-slot__status--free' : ''}`}>
                  {slot.isAvailable ? 'Livre' : 'Ocupado'}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : slotsDate ? (
        <div className="adm-empty">
          <p>Nenhum horário cadastrado para esta data.</p>
        </div>
      ) : null}
    </div>
  );
}
