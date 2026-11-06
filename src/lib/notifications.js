import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getReminderTimes, validateSettings } from './schedule';

const CHANNEL_ID = 'hidratacao';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function prepareAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lembretes de hidratação',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 130, 200],
    sound: 'default',
  });
}

export async function hasNotificationPermission() {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermission() {
  await prepareAndroidChannel();
  if (await hasNotificationPermission()) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function syncReminders(settings) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.notificationsEnabled) return 0;
  const validationError = validateSettings(settings);
  if (validationError) throw new Error(validationError);
  await prepareAndroidChannel();
  if (!(await hasNotificationPermission())) {
    throw new Error('As notificações estão bloqueadas nas configurações do celular.');
  }
  const times = getReminderTimes(settings);
  for (const time of times) {
    const [hour, minute] = time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora de beber água 💧',
        body: `Que tal ${settings.sipsPerRound} goladas tranquilas pelo canudo?`,
        sound: 'default',
        data: { screen: 'today', kind: 'hydration' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }
  return times.length;
}

export async function scheduleTestNotification(sips) {
  await prepareAndroidChannel();
  if (!(await requestNotificationPermission())) {
    throw new Error('Permita as notificações do aplicativo para testar.');
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Teste de hidratação 💧',
      body: `Funcionou! Sua próxima pausa pode ter ${sips} goladas.`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
}
