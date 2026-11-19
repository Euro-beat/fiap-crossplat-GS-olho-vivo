import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { buscarParadas, buscarPrevisaoParada } from "../services/sptransApi";
import {
  obterLocalizacaoAtual,
  calcularDistanciaMetros,
  dispararAlertaMobilidade
} from "../services/deviceServices";

export default function NearbyStopsTab({ theme }) {
  const [userCoords, setUserCoords] = useState(null);
  const [termoBusca, setTermoBusca] = useState("");
  const [paradas, setParadas] = useState([]);
  const [previsoesInfo, setPrevisoesInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState("");

  async function atualizarGPS() {
    setLoading(true);
    setAviso("");
    const coords = await obterLocalizacaoAtual();
    if (coords) {
      setUserCoords(coords);
      if (termoBusca.trim()) {
        await pesquisarParadas(termoBusca, coords);
      } else {
        setAviso("GPS atualizado. Digite um ponto ou avenida e toque em Buscar.");
      }
    } else {
      setAviso("Não foi possível obter a localização GPS.");
    }
    setLoading(false);
  }

  useEffect(() => {
    atualizarGPS();
  }, []);

  async function pesquisarParadas(termo = termoBusca, coordsAtuais = userCoords) {
    const termoLimpo = String(termo || "").trim();
    if (!termoLimpo) {
      setAviso("Digite um ponto, rua ou avenida de São Paulo para buscar.");
      return;
    }
    
    setLoading(true);
    setAviso("");
    setPrevisoesInfo(null);

    try {
      const lista = await buscarParadas(termo);
      const enriquecida = lista.map((p) => {
        const distancia =
          coordsAtuais && typeof p.py === "number" && typeof p.px === "number"
            ? calcularDistanciaMetros(
                coordsAtuais.latitude,
                coordsAtuais.longitude,
                p.py,
                p.px
              )
            : null;
        return { ...p, distancia };
      });

      enriquecida.sort((a, b) => (a.distancia ?? 999999) - (b.distancia ?? 999999));
      setParadas(enriquecida);

      if (enriquecida.length === 0) {
        setAviso("Nenhuma parada encontrada para este termo.");
      }
    } catch (e) {
      setAviso(
        e.message === "SESSAO_EXPIRADA"
          ? "Sessão SPTrans expirada. Reinicie o app para autenticar."
          : "Erro ao buscar paradas."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verPrevisao(parada) {
    setLoading(true);
    setAviso("");
    try {
      const { hr, ponto } = await buscarPrevisaoParada(parada.cp);
      const linhas = Array.isArray(ponto?.l) ? ponto.l : [];
      const listaPrev = [];

      linhas.forEach((l) => {
        (l.vs || []).forEach((v) => {
          listaPrev.push({
            id: `${l.c}-${v.p}`,
            letreiro: l.c,
            destino: `${l.lt0 || ""} → ${l.lt1 || ""}`,
            prefixo: v.p,
            chegada: v.t,
            acessivel: Boolean(v.a)
          });
        });
      });

      setPrevisoesInfo({
        nome: ponto?.np || parada.np,
        distancia: parada.distancia,
        hr,
        itens: listaPrev
      });
    } catch {
      setAviso("Erro ao consultar previsão de chegada deste ponto.");
    } finally {
      setLoading(false);
    }
  }

  async function agendarAvisoChegada(item, nomePonto) {
    await dispararAlertaMobilidade(
      `Alerta ativado: Linha ${item.letreiro}`,
      `Carro ${item.prefixo} com previsão de chegada às ${item.chegada} no ponto ${nomePonto}.`
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra GPS */}
      <View style={[styles.gpsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.gpsTitle, { color: theme.primary }]}>GPS DO APARELHO</Text>
          <Text style={{ color: theme.text, fontSize: 12 }}>
            {userCoords
              ? `Lat: ${userCoords.latitude.toFixed(5)} | Lon: ${userCoords.longitude.toFixed(5)}`
              : "Aguardando sinal de GPS..."}
          </Text>
        </View>
        <TouchableOpacity
          onPress={atualizarGPS}
          style={[styles.smallBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={{ color: theme.primaryText, fontSize: 12, fontWeight: "700" }}>
            Atualizar GPS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Busca de pontos próximos / por região */}
      <View style={styles.searchRow}>
        <TextInput
          value={termoBusca}
          onChangeText={setTermoBusca}
          placeholder="Ex: Paulista, Anhangabaú, Lapa..."
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }
          ]}
        />
        <TouchableOpacity
          onPress={() => pesquisarParadas()}
          style={[styles.searchBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={theme.primary} style={{ marginVertical: 12 }} /> : null}
      {aviso ? <Text style={[styles.aviso, { color: theme.warning }]}>{aviso}</Text> : null}

      {/* Painel de Previsão do Ponto Selecionado */}
      {previsoesInfo ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>
              {previsoesInfo.nome}
            </Text>
            <TouchableOpacity onPress={() => setPrevisoesInfo(null)}>
              <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 12 }}>Voltar</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 8 }}>
            Consulta: {previsoesInfo.hr}
            {previsoesInfo.distancia !== null ? ` • Distância do seu GPS: ${previsoesInfo.distancia} m` : ""}
          </Text>

          {previsoesInfo.itens.length === 0 ? (
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              Nenhum ônibus com previsão ativa neste horário.
            </Text>
          ) : (
            previsoesInfo.itens.map((item) => (
              <View
                key={item.id}
                style={[styles.prevItem, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.primary, fontWeight: "800", fontSize: 13 }}>
                    {item.letreiro} • Carro {item.prefixo} {item.acessivel ? "♿" : ""}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>{item.destino}</Text>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700", marginTop: 2 }}>
                    Chegada prevista: {item.chegada}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => agendarAvisoChegada(item, previsoesInfo.nome)}
                  style={[styles.alertBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: theme.primaryText, fontSize: 11, fontWeight: "700" }}>
                    Notificar
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      ) : (
        <FlatList
          data={paradas}
          keyExtractor={(item) => String(item.cp)}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{item.np}</Text>
                {item.distancia !== null ? (
                  <Text style={{ color: theme.primary, fontWeight: "800", fontSize: 12 }}>
                    {item.distancia} m
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                {item.ed || "Endereço não informado"}
              </Text>
              <TouchableOpacity
                onPress={() => verPrevisao(item)}
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={{ color: theme.primaryText, fontSize: 12, fontWeight: "700" }}>
                  Ver próximos ônibus neste ponto
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, gap: 10 },
  gpsBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  gpsTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  searchBtn: { paddingHorizontal: 16, justifyContent: "center", borderRadius: 10 },
  aviso: { fontSize: 12, textAlign: "center", marginVertical: 6 },
  card: { borderWidth: 1.5, borderRadius: 12, padding: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  actionBtn: { marginTop: 10, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  prevItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  alertBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }
});