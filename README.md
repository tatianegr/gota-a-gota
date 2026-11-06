# Gota a Gota 💧

Um aplicativo de hidratação para quem prefere contar **goladas** em vez de medir mililitros. Feito com React Native + Expo, para **iOS e Android**.

O aplicativo foi pensado para um copo de **2 litros com canudo e sem marcações**. Ele não tenta converter goladas em ml, porque cada pessoa bebe um volume diferente em cada golada.

## O que já funciona

- **Registro de goladas:** toque em “Bebi minhas 10 goladas” para registrar uma pausa. É possível desfazer o último registro do dia.
- **Notificações locais:** o próprio celular agenda avisos diários. Elas podem aparecer mesmo com o app fechado, respeitando as configurações de notificações e economia de bateria do aparelho.
- **Horários configuráveis:** escolha início, término e intervalos de 1h, 1h30, 2h ou 3h.
- **Goladas por pausa:** escolha 6, 8, 10, 12 ou 15.
- **Histórico local:** veja as pausas e goladas dos últimos sete dias.
- **Teste de notificação:** envie um aviso para daqui a cinco segundos.
- **Privacidade:** sem login, sem servidor e sem coleta de dados. O histórico fica armazenado neste dispositivo.

As notificações **não ficam ligadas automaticamente**. Ative-as em **Ajustes → Lembretes no celular** e conceda a permissão solicitada.

## Requisitos

- Node.js **22.13 ou superior** e npm.
- Um iPhone ou Android com o **Expo Go compatível com Expo SDK 58**.
- Um computador com VS Code (opcional, mas recomendado).

## Versão web instalável (PWA)

A pasta `docs/` contém um site independente, com registro de goladas, histórico de sete dias, configurações e cache offline. Os dados são armazenados no próprio navegador.

Para publicar usando GitHub Pages:
1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment**, selecione **Deploy from a branch**.
3. Selecione a branch **main** e a pasta **/docs**; clique em **Save**.
4. Após a implantação, o endereço será `https://tatianegr.github.io/gota-a-gota/`.

No iPhone, abra esse endereço no **Safari**, use **Compartilhar → Adicionar à Tela de Início** e confirme.

**Limitação de avisos:** nesta PWA, os lembretes aparecem **enquanto o site está aberto**. Notificações com o app fechado requerem backend de Web Push (subscription + servidor com agendamento e chaves VAPID). Somente GitHub Pages não oferece esse backend. A versão Expo nativa usa notificações locais e funciona de maneira diferente.

## Rodar no celular

1. Descompacte este projeto e abra a pasta `gota-a-gota` no VS Code.
2. No terminal, dentro da pasta, execute:

   ```bash
   npm install
   npx expo start
   ```

3. Instale/atualize o **Expo Go** no celular.
4. Com o computador e o celular na mesma rede, escaneie o QR code exibido no terminal. No iPhone, use a câmera ou o Expo Go.
5. No app, abra **Ajustes**, ative os lembretes e permita as notificações. Use **Enviar notificação de teste** para conferir.

Se houver problema de conexão na rede local, execute:

```bash
npx expo start --tunnel
```

> Expo Go é apropriado para desenvolvimento e testes. Para distribuir o app como aplicativo independente, crie um build assinado. No iPhone, a distribuição para dispositivos reais normalmente exige cadastro no Apple Developer Program (por exemplo, via TestFlight).

## Configuração inicial

| Opção | Valor |
|---|---|
| Primeiro lembrete | 08:00 |
| Último horário-limite | 21:00 |
| Frequência | A cada 90 minutos |
| Goladas | 10 por pausa |
| Notificações | Desativadas até o usuário autorizar |

Com a configuração inicial, os lembretes são programados para **08:00, 09:30, 11:00, 12:30, 14:00, 15:30, 17:00, 18:30 e 20:00**. A agenda usa horários locais do celular. A entrega exata depende do sistema operacional.

## Testes

```bash
npm test
npx expo install --check
```

O primeiro comando testa as regras de horário e datas. O segundo verifica se as versões instaladas das dependências estão alinhadas com o Expo SDK.

## Colocar no GitHub

Crie um repositório vazio no GitHub (por exemplo, `gota-a-gota`). Na pasta do projeto, execute:

```bash
git init
git add .
git commit -m "Primeira versão do Gota a Gota"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/gota-a-gota.git
git push -u origin main
```

Troque `SEU_USUARIO` pelo seu usuário do GitHub. Caso o repositório já exista e tenha commits, siga um fluxo de clone e merge em vez de sobrescrever o histórico.

## Gerar um aplicativo independente (opcional)

Consulte a documentação atualizada do EAS: https://docs.expo.dev/build/setup/

Um fluxo inicial é:

```bash
npm install --global eas-cli
eas login
eas build:configure
eas build --platform ios
```

Você precisa também configurar um **bundle identifier** único em `app.json` (substitua `com.seuprojeto.gotaagota`) e fornecer as credenciais de assinatura exigidas pela Apple. Para Android, personalize também `android.package`.

Apenas subir o código no GitHub **não instala o app no celular** e não envia notificações. É preciso executá-lo no Expo Go ou instalar um build nativo. O app usa **notificações locais**, e não mensagens push enviadas por um servidor.

## Organização

```text
├── App.js                         # Telas e estado do app
├── index.js                       # Entrada da aplicação
├── app.json                       # Configuração Expo
├── eas.json                       # Perfis de build
├── src/lib/schedule.js            # Regras de horário e datas
├── src/lib/notifications.js       # Permissões e notificações locais
├── src/lib/storage.js             # Persistência local
├── tests/schedule.test.js         # Testes automatizados
└── assets/                         # Ícones do aplicativo
```

## Nota sobre hidratação

Registrar 90 goladas **não significa** consumir 2 litros. A quantidade ideal de líquidos varia conforme condições individuais, alimentação, exercício e clima. Beba conforme a sede e recomendações de profissionais de saúde; não force água apenas para completar indicadores do app.

Feito para transformar o hábito de beber água em pausas pequenas e possíveis.
