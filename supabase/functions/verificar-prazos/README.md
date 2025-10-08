# Guia de Implantação da Função de Remanejamento Automático

Esta função (`verificar-prazos`) é o "motor" que roda em segundo plano para remanejar leads que não foram atendidos no prazo. Siga os passos abaixo para implantá-la e ativá-la no seu projeto Supabase.

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

### Passo 4: Definir os Segredos (Environment Variables)

A nossa função precisa de chaves de acesso seguras para poder modificar o banco de dados. Estas chaves **não** ficam no código, elas são guardadas de forma segura no Supabase.

1.  Vá para o seu painel do Supabase.
2.  Vá para **Project Settings** > **API**.
3.  Encontre a seção **Project API keys**.
4.  Copie a chave que está no campo `service_role`. **Atenção: esta chave é secreta e muito poderosa, não a compartilhe.**
5.  Volte ao terminal e rode o comando abaixo, substituindo `[SUA_SERVICE_ROLE_KEY]` pela chave que você copiou:

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[SUA_SERVICE_ROLE_KEY]
```

### Passo 5: Fazer o Deploy da Função

Agora que tudo está configurado, vamos enviar o código da função para os servidores do Supabase. Rode o seguinte comando no terminal:

```bash
npx supabase functions deploy verificar-prazos
```
Se tudo der certo, você verá uma mensagem de sucesso.

### Passo 6: Agendar a Função (Cron Job)

O último passo é dizer ao Supabase para rodar essa função automaticamente. Vamos agendá-la para rodar **a cada minuto**.

- A sintaxe `* * * * *` é um padrão universal (chamado "cron") que significa "a cada minuto, de cada hora, de cada dia...".
- Rode o comando abaixo no terminal para criar o agendamento:

```bash
npx supabase functions deploy verificar-prazos --schedule "*/1 * * * *"
```

**Pronto!** O seu motor de automação está implantado e funcionando. A cada minuto, ele irá verificar por leads atrasados e remanejá-los conforme as regras que o gestor definir no sistema.
