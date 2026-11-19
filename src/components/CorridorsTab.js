import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { listarCorredores } from "../services/sptransApi";

export default function CorridorsTab({ theme }) {
  const [corredores, setCorredores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarCorredores()
      .then(setCorredores)
      .catch(() => setErro("Não foi possível carregar os corredores."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />;
  if (erro) return <Text style={{ color: theme.danger, textAlign: "center", marginTop: 20 }}>{erro}</Text>;

  return (
    <FlatList
      data={corredores}
      keyExtractor={(item) => String(item.cc)}
      contentContainerStyle={{ padding: 14, gap: 10 }}
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>
            {item.nc || "Corredor"}
          </Text>
          <Text style={{ color: theme.primary, fontSize: 12, marginTop: 2 }}>
            Código: {item.cc}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 12, padding: 12 }
});