export const fmtPhone = (p: string) => {
  const c = p.replace(/\D/g, '');
  return c.length === 11 ? `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}` : p;
};

export const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const calcEndTime = (startTime: string, durationMin: number): string => {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + durationMin;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
};

export const fmtDate = (d: string) => {
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};
