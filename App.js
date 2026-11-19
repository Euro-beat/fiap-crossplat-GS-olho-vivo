import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets
} from "react-native-safe-area-context";
import { SystemBars } from "react-native-edge-to-edge";
import { FIAP_DARK, HIGH_CONTRAST } from "./src/theme/colors";
import TokenScreen from "./src/components/TokenScreen";
import NearbyStopsTab from "./src/components/NearbyStopsTab";
import LinesMapTab from "./src/components/LinesMapTab";
import CorridorsTab from "./src/components/CorridorsTab";

function MainApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [activeTab, setActiveTab] = useState("gps");

  const insets = useSafeAreaInsets();
  const theme = highContrast ? HIGH_CONTRAST : FIAP_DARK;

  // Cor personalizada para a área dos botões inferiores
  const navBarBgColor = authenticated ? theme.surface : theme.bg;

  const conteudo = !authenticated ? (
    <View style={{ flex: 1, paddingBottom: insets.bottom }}>
      <TokenScreen
        theme={theme}
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast((prev) => !prev)}
        onAuthenticated={() => setAuthenticated(true)}
      />
    </View>
  ) : (
    <>
      <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Olho Vivo <Text style={{ color: theme.primary }}>SP</Text>
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 11 }}>
            FIAP Global Solution • Mobilidade
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setHighContrast((prev) => !prev)}
          style={[styles.contrastBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
        >
          <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "700" }}>
            {highContrast ? "Tema FIAP" : "Alto Contraste"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {[
          { key: "gps", label: "Perto de Mim" },
          { key: "linhas", label: "Linhas & Mapa" },
          { key: "corredores", label: "Corredores" }
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabItem,
                { borderBottomColor: active ? theme.primary : "transparent" }
              ]}
            >
              <Text
                style={{
                  color: active ? theme.primary : theme.textMuted,
                  fontWeight: active ? "800" : "600",
                  fontSize: 13
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "gps" && <NearbyStopsTab theme={theme} />}
        {activeTab === "linhas" && <LinesMapTab theme={theme} />}
        {activeTab === "corredores" && <CorridorsTab theme={theme} />}
      </View>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: navBarBgColor,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 8)
          }
        ]}
      >
        <Text style={{ color: theme.textMuted, fontSize: 11, textAlign: "center" }}>
          Dados fornecidos por SPTrans Olho Vivo • FIAP Global Solution
        </Text>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Controla tanto a StatusBar quanto a NavigationBar no SDK 54 */}
      <SystemBars
        style={{
          statusBar: "light",
          navigationBar: "light"
        }}
      />

      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[styles.container, { backgroundColor: theme.bg }]}
      >
        {conteudo}
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerTitle: { fontSize: 19, fontWeight: "800" },
  contrastBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2.5 },
  footer: { paddingTop: 8, paddingHorizontal: 12, borderTopWidth: 1 }
});
