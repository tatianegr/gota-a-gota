# Serviço de notificações do Gota a Gota

Este é o **serviço de envio de Web Push** usado pelo site hospedado no GitHub Pages em
https://tatianegr.github.io/gota-a-gota/

**O site continua no GitHub Pages**. O Cloudflare Worker apenas envia notificações em segundo plano, usando:
- D1 para armazenar inscrições de aparelhos e horários;
- Web Push + chaves VAPID para enviar mensagens criptografadas;
- Cron Trigger a cada 5 minutos para disparar lembretes;
- código privado de ativação para impedir inscrições públicas sem autorização.

O serviço **não armazena o histórico de goladas**; esse histórico permanece no navegador do aparelho. Ele armazena o endpoint de notificação, as chaves públicas da inscrição, o fuso horário e os horários escolhidos.

## Antes de começar

Você precisará de uma conta Cloudflare gratuita e de um computador com Node.js/npm. Não é necessário hospedar o site na Cloudflare ou mover os arquivos do GitHub Pages.

> **Atenção:** não coloque chaves privadas nem o código de ativação em arquivos do GitHub. Use os *secrets* do Cloudflare Worker.

### 1. Baixar o projeto e fazer login na Cloudflare

No terminal:

```bash
git clone https://github.com/tatianegr/gota-a-gota.git
cd gota-a-gota/push-backend
npm install
npx wrangler login
```

### 2. Criar banco de inscrições D1

```bash
npx wrangler d1 create gota-a-gota-push
```

Copie o `database_id` UUID que o comando retornar. No arquivo `wrangler.toml`, substitua:

```toml
database_id = "SUBSTITUA_PELO_ID_DO_SEU_BANCO_D1"
```

pelo identificador do seu banco. Não altere o `binding = "DB"`.

Depois, crie a tabela remota:

```bash
npx wrangler d1 migrations apply gota-a-gota-push --remote
```

### 3. Criar as chaves VAPID

```bash
npx web-push generate-vapid-keys
```

Guarde a **Public Key** e a **Private Key**. Não envie a chave privada a ninguém.

Gere também um código de ativação exclusivo, com mais de 20 caracteres:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Guarde esse código: você o digitará uma vez na tela Ajustes do Gota a Gota.

### 4. Implantar o Worker

```bash
npx wrangler deploy
```

Em seguida, configure os quatro secrets (cada comando vai pedir o valor de forma privada):

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
npx wrangler secret put SETUP_CODE
```

- `VAPID_PUBLIC_KEY`: public key da etapa 3.
- `VAPID_PRIVATE_KEY`: private key da etapa 3.
- `VAPID_SUBJECT`: um contato seu no formato `mailto:seu-email@exemplo.com`.
- `SETUP_CODE`: código aleatório criado na etapa 3.

O endereço final do Worker, exibido após o deploy, costuma ter o formato:
`https://gota-a-gota-push.<seu-subdominio>.workers.dev`

Verifique que `https://...workers.dev/health` responde `{"ok":true}` e que
`https://...workers.dev/api/config` retorna a **chave pública**, nunca a privada.

### 5. Ativar no iPhone

1. Abra https://tatianegr.github.io/gota-a-gota/ pelo Safari.
2. Toque em **Compartilhar → Adicionar à Tela de Início**.
3. **Abra o app pelo ícone da tela de início**, não pela aba do Safari.
4. Em **Ajustes → Notificações com o app fechado**, digite o endereço `workers.dev` da etapa anterior e seu código privado.
5. Toque em **Ativar notificações no celular** e permita as notificações quando o iOS pedir.
6. Toque em **Enviar notificação de teste**. Depois, feche o app para confirmar que as notificações chegam normalmente.

Os horários que você salvar no aplicativo são enviados ao Worker. As notificações usam o fuso horário do dispositivo e podem atrasar alguns minutos porque o serviço verifica os horários a cada 5 minutos. Como qualquer notificação, a entrega depende também de rede, modo Foco e permissões do iPhone.

### Alterar horários

Depois de ativar as notificações, altere as opções de Ajustes e clique em **Salvar meus horários**. Os horários locais serão sincronizados com o serviço. Se a sincronização falhar, o aplicativo vai informar isso na seção de notificações.

### Desativar

Clique em **Desativar** no próprio aplicativo. Isso remove a inscrição do serviço e desativa o PushManager. O histórico de goladas não é apagado.

## Testes do algoritmo de horários

```bash
npm test
```

## Observações de segurança

- O código de ativação é armazenado **no navegador do dispositivo**, não no GitHub; não instale o aplicativo em aparelhos compartilhados com esse código.
- O Worker valida a origem pública do Gota a Gota, exige código privado para operações sensíveis e limita o cadastro a 10 aparelhos.
- O endpoint de envio do Apple Push Service é criptografado usando o padrão Web Push.
- Se precisar trocar as chaves VAPID, os aparelhos deverão se inscrever novamente.
- O Cron roda em UTC e converte os horários com `Intl.DateTimeFormat`, respeitando o fuso configurado.
- A ativação no iPhone exige **iOS 16.4 ou posterior**, PWA adicionada à tela de início e um toque explícito para solicitar permissão.
- O serviço é independente da publicação do site: falhas de implantação do Worker não devem impedir o registro normal de goladas.

Documentação: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers e https://developers.cloudflare.com/workers/configuration/cron-triggers/
