import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from './schedule';

const SETTINGS_KEY = '@gota-a-gota/settings-v1';
const ENTRIES_KEY = '@gota-a-gota/entries-v1';

export async function loadAppData() {
  const [settingsData, entriesData] = await Promise.all([
    AsyncStorage.getItem(SETTINGS_KEY),
    AsyncStorage.getItem(ENTRIES_KEY),
  ]);
  const savedSettings = settingsData ? JSON.parse(settingsData) : {};
  const savedEntries = entriesData ? JSON.parse(entriesData) : [];
  return {
    settings: { ...DEFAULT_SETTINGS, ...savedSettings },
    entries: Array.isArray(savedEntries) ? savedEntries : [],
  };
}

export function saveSettings(settings) {
  return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function saveEntries(entries) {
  return AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}
