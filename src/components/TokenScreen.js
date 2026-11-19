import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { autenticarSPTrans } from "../services/sptransApi";

const STORAGE_KEY = "@sptrans_token";

export default function TokenScreen({ theme, highContrast, onToggleContrast, onAuthenticated }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [validandoSalvo, setValidandoSalvo] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function verificarTokenSalvo() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!saved || !saved.trim()) {
          if (ativo) setValidandoSalvo(false);
          return;
        }

        if (ativo) setToken(saved);

        // Só entra automaticamente se a API SPTrans confirmar que o token salvo retorna true
        const ok = await autenticarSPTrans(saved);
        if (ok === true && ativo) {
          onAuthenticated();
          return;
        }
      } catch {
        // Se o token salvo falhar ou não retornar true, remove do storage
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        if (ativo) {
          setToken("");
          setErro("Token salvo inválido ou expirado. Informe um novo token.");
        }
      } finally {
        if (ativo) setValidandoSalvo(false);
      }
    }

    verificarTokenSalvo();
    return () => {
      ativo = false;
    };
  }, []);

  async function handleEntrar() {
    const tokenLimpo = token.trim();
    if (!tokenLimpo) {
      setErro("Informe o token da API SPTrans antes de entrar.");
      return;
    }

    setErro("");
    setLoading(true);
    try {
      // Só salva no AsyncStorage se autenticarSPTrans retornar explicitamente true
      const autenticado = await autenticarSPTrans(tokenLimpo);
      if (autenticado === true) {
        await AsyncStorage.setItem(STORAGE_KEY, tokenLimpo);
        onAuthenticated();
      }
    } catch (e) {
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      setErro(e.message || "Falha na autenticação com a SPTrans.");
    } finally {
      setLoading(false);
    }
  }

  if (validandoSalvo) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textMuted, marginTop: 12, fontSize: 13 }}>
          Validando sessão na API SPTrans...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Olho Vivo <Text style={{ color: theme.primary }}>SP</Text>
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              FIAP Global Solution • Mobile
            </Text>
          </View>

          <TouchableOpacity
            onPress={onToggleContrast}
            style={[styles.contrastBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
          >
            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "700" }}>
              {highContrast ? "Tema FIAP" : "Alto Contraste"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.desc, { color: theme.textMuted }]}>
          Insira seu token da API Olho Vivo para liberar o monitoramento por GPS, mapas em tempo real e alertas de chegada.
        </Text>

        <Text style={[styles.label, { color: theme.primary }]}>TOKEN DA API SPTRANS</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Cole seu token aqui"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              backgroundColor: theme.bg,
              borderColor: theme.border,
              color: theme.text
            }
          ]}
        />

        <TouchableOpacity
          onPress={handleEntrar}
          disabled={loading}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          {loading ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.primaryText }]}>Entrar</Text>
          )}
        </TouchableOpacity>

        {erro ? <Text style={[styles.errorText, { color: theme.danger }]}>{erro}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  card: { borderWidth: 1.5, borderRadius: 16, padding: 20, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 2 },
  contrastBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  desc: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginTop: 4 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  button: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { fontWeight: "700", fontSize: 15 },
  errorText: { fontSize: 12, textAlign: "center", fontWeight: "600" }
});