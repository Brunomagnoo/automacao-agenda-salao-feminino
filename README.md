# Agenda de Cabeleireiros Automatizada ✂️

Um Micro SaaS (Software as a Service) completo e resiliente para gestão de agendamentos e horários de salões de beleza. Este projeto foi arquitetado com foco extremo em **Performance, Segurança e Experiência do Usuário (UX)**, aplicando as melhores práticas de Clean Code e resiliência de software.

---

## 🎯 O Desafio
Criar um sistema de reservas de horários que não apenas fosse bonito, mas que fosse **impossível de quebrar** sob alta demanda (ex: datas festivas onde vários clientes tentam agendar ao mesmo tempo). O sistema resolve problemas crônicos de "Overbooking" (duplo agendamento) e quedas de servidor.

---

## 🛠️ Arquitetura e Tecnologias Utilizadas

A stack foi cuidadosamente selecionada para garantir escalabilidade global com custos mínimos de infraestrutura inicial (Serverless).

### 1. Frontend & Core Framework
*   **Next.js (App Router):** Escolhido pela capacidade de renderização no servidor (SSR), entregando HTML pronto para o celular do cliente. Isso zera o tempo de carregamento de telas pesadas e melhora agressivamente o SEO.
*   **React & TypeScript:** Tipagem estática rigorosa ponta a ponta. Erros que normalmente iriam para produção são barrados diretamente no momento da escrita do código.
*   **Vanilla CSS + Variáveis Globais:** Design System construído "do zero" sem dependência de bibliotecas de componentes pesadas. Resulta em um pacote final extremamente leve (alta pontuação no Lighthouse) e com visuais Premium (Glassmorphism e Neumorphism).

### 2. Backend & API
*   **Node.js (Serverless API Routes):** A API roda em funções serverless da Vercel. Cada rota escala infinitamente de forma independente.
*   **Zod (Schema Validation):** Atua como o "leão de chácara" da API. Toda requisição HTTP é interceptada e validada matematicamente contra injeção de dados falsos ou maliciosos antes mesmo de tocar na regra de negócios. Evita falhas críticas de banco de dados.
*   **Transações Seguras:** Todo o fluxo de reserva e bloqueio de calendário é executado em Transações Atômicas. Se algo falhar no milissegundo final, o banco faz "Rollback", garantindo que nenhum horário fique "fantasma".

### 3. Banco de Dados e Infraestrutura
*   **PostgreSQL (Supabase):** Banco de dados relacional hospedado na nuvem. Totalmente estruturado com Índices (`@@index`) nas tabelas críticas (Horários e Usuários), impedindo "Full Table Scans" e tornando buscas instantâneas mesmo com milhões de registros.
*   **Prisma ORM (Singleton):** Ponte limpa e auto-tipada entre o Node e o Postgres. 
*   **Vercel:** Hospedagem nativa Edge/Serverless.

### 4. Segurança e Privacidade (AppSec)
*   **JWT & HTTPOnly Cookies:** A sessão do usuário trafega exclusivamente via Cookies HTTPOnly, tornando ataques de interceptação (XSS) nulos.
*   **Bcrypt Assíncrono:** Senhas criptografadas em hash utilizando `await compare()`, garantindo que o Event Loop do Node.js nunca seja bloqueado (o que derrubaria a API em picos de login).

---

## 🚀 Como Executar o Projeto

1. Clone o repositório.
2. Crie o arquivo `.env.local` na raiz e insira a string de conexão do seu PostgreSQL (`DATABASE_URL`) e `JWT_SECRET`.
3. Instale as dependências: `npm install`
4. Sincronize o banco de dados: `npx prisma db push`
5. Rode a aplicação: `npm run dev`

---

## 📊 Plano de Evolução (Roadmap)
*   [x] Bloqueio transacional de concorrência.
*   [x] Autenticação e Autorização por Níveis (Admin/Client).
*   [x] Dashboards financeiros em tempo real.
*   [ ] Testes E2E Automatizados com Playwright.
*   [ ] Integração Oficial via WhatsApp API.

