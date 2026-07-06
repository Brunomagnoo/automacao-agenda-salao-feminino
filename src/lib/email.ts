import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!process.env.SALON_EMAIL) {
  console.warn('[Email] SALON_EMAIL env var not set — email notifications will be skipped.');
}
const SALON_EMAIL = process.env.SALON_EMAIL ?? '';

interface SendNotificationProps {
  clientName: string;
  clientPhone: string;
  services: string[];
  date: string;
  startTime: string;
  totalEstimated: number;
}

export async function sendAppointmentNotification(data: SendNotificationProps) {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Skipping email notification.');
    return;
  }

  const { clientName, clientPhone, services, date, startTime, totalEstimated } = data;

  try {
    await resend.emails.send({
      from: 'Beauty Salon <onboarding@resend.dev>', // Usar domínio verificado no futuro
      to: SALON_EMAIL,
      subject: `Novo Agendamento: ${clientName} - ${date} às ${startTime}`,
      html: `
        <h2>Novo Agendamento Recebido!</h2>
        <p>Você tem um novo agendamento no sistema.</p>
        
        <h3>Detalhes do Cliente:</h3>
        <ul>
          <li><strong>Nome:</strong> ${clientName}</li>
          <li><strong>Telefone:</strong> ${clientPhone}</li>
        </ul>
        
        <h3>Detalhes do Agendamento:</h3>
        <ul>
          <li><strong>Data:</strong> ${date}</li>
          <li><strong>Horário:</strong> ${startTime}</li>
          <li><strong>Serviços:</strong> ${services.join(', ')}</li>
          <li><strong>Valor Estimado:</strong> R$ ${totalEstimated.toFixed(2).replace('.', ',')}</li>
        </ul>
        
        <p>Acesse o <a href="https://beauty-salon-app-eight.vercel.app/admin" style="color: #c79f87; font-weight: bold;">painel Admin</a> para confirmar ou gerenciar este agendamento.</p>
      `,
    });
    console.log('[Email] Notificação de agendamento enviada com sucesso.');
  } catch (error) {
    console.error('[Email] Erro ao enviar notificação:', error instanceof Error ? error.message : 'Erro desconhecido');
  }
}
