# Guia de Implantação da Função de Relatório Diário

Esta função (`enviar-relatorio-diario-n8n`) é o "motor" que roda em segundo plano para coletar os dados de atendimento e enviá-los para o n8n. Siga os passos abaixo para implantá-la e ativá-la no seu projeto Supabase.

### Pré-requisitos
- Você precisa ter o [Node.js](https://nodejs.org/) instalado.
- Você precisa ter uma conta no [Supabase](https://supabase.com/).

---

### Passo 1: Instalar a CLI do Supabase

Se você ainda não tem a CLI (Command Line Interface) do Supabase instalada, abra o terminal do seu computador (ou o do seu editor de código, como o VS Code) e rode o seguinte comando:

```bash
npm install supabase --save-dev
```

### Passo 2: Fazer o Login na CLI

Ainda no terminal, na pasta do seu projeto, rode o comando abaixo. Ele vai abrir uma página no seu navegador para que você possa autorizar o acesso à sua conta Supabase.

```bash
npx supabase login
```

### Passo 3: Ligar seu Projeto Local ao Projeto Remoto

Agora, precisamos dizer à CLI qual projeto no Supabase você quer usar.
1. Vá para o seu [painel do Supabase](https://app.supabase.com).
2. Entre no seu projeto.
3. Vá para **Project Settings** > **General**.
4. Copie a **Reference ID**.
5. Volte ao terminal e rode o comando abaixo, substituindo `[SUA_REFERENCE_ID]` pela ID que você copiou:

```bash
npx supabase link --project-ref [SUA_REFERENCE_ID]
```

### Passo 4: Fazer o Deploy da Função

Agora que tudo está configurado, vamos enviar o código da função para os servidores do Supabase. Rode o seguinte comando no terminal:

```bash
npx supabase functions deploy enviar-relatorio-diario-n8n
```
Se tudo der certo, você verá uma mensagem de sucesso.

### Passo 5: Agendar a Função (Cron Job)

O último passo é dizer ao Supabase para rodar essa função automaticamente. Vamos agendá-la para rodar **todos os dias às 18:00 (horário de Brasília)**.

- O servidor do Supabase opera em UTC. O horário de Brasília (BRT) é UTC-3. Portanto, 18:00 BRT corresponde a 21:00 UTC.
- A sintaxe cron para "às 21:00 todos os dias" é `0 21 * * *`.
- Rode o comando abaixo no terminal para criar o agendamento:

```bash
npx supabase functions deploy enviar-relatorio-diario-n8n --schedule "0 21 * * *"
```

**Pronto!** Sua automação de relatório está implantada e agendada para rodar todos os dias. A cada execução, ela coletará os dados e os enviará para a URL do webhook que você configurou no painel de admin.
