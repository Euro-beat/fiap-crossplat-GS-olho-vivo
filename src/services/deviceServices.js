import * as Location from "expo-location";
import { Alert, LogBox, Platform, Vibration } from "react-native";

// Silencia apenas o aviso sobre Push remoto no Expo Go (usamos notificações locais)
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "`expo-notifications` functionality is not fully supported in Expo Go"
]);

let notificationsConfigured = false;

async function getNotificationsModule() {
  try {
    const Notifications = await import("expo-notifications");
    if (!notificationsConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false
        })
      });
      notificationsConfigured = true;
    }
    return Notifications;
  } catch (e) {
    console.warn("Notificações locais indisponíveis:", e);
    return null;
  }
}

export async function solicitarPermissaoGPS() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permissão de GPS necessária",
      "Ative a localização para encontrar pontos próximos e acompanhar seu trajeto."
    );
    return false;
  }
  return true;
}

export async function obterLocalizacaoAtual() {
  const permitido = await solicitarPermissaoGPS();
  if (!permitido) return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });

  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude
  };
}

export async function solicitarPermissaoNotificacao() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("mobilidade-sp", {
      name: "Alertas de Ônibus",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300]
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function dispararAlertaMobilidade(titulo, corpo) {
  // Vibra o celular imediatamente
  Vibration.vibrate([0, 400, 200, 400]);

  // Exibe alerta na tela enquanto o app estiver aberto
  Alert.alert(titulo, corpo);

  // Envia notificação local na central de notificações
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const permitido = await solicitarPermissaoNotificacao();
  if (permitido) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: corpo,
        sound: true
      },
      trigger: null
    });
  }
}

// Calcula distância em metros entre duas coordenadas (Fórmula de Haversine)
export function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}