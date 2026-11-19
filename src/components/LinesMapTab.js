import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import {
  buscarLinhas,
  buscarPosicaoLinha,
  buscarParadasPorLinha
} from "../services/sptransApi";
import {
  solicitarPermissaoGPS,
  calcularDistanciaMetros,
  dispararAlertaMobilidade
} from "../services/deviceServices";

const SP_CENTER = {
  latitude: -23.55052,
  longitude: -46.633308,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05
};

function normalizarCoord(latRaw, lonRaw) {
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat === 0 && lon === 0) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

export default function LinesMapTab({ theme }) {
  const [termo, setTermo] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [paradasLinha, setParadasLinha] = useState([]);
  const [apenasAcessiveis, setApenasAcessiveis] = useState(false);
  const [linhaAtiva, setLinhaAtiva] = useState(null);
  const [pontoDestino, setPontoDestino] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    let subscription = null;

    async function iniciarMonitoramentoDescida() {
      const ok = await solicitarPermissaoGPS();
      if (!ok) return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20
        },
        async (loc) => {
          const atual = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          };
          setUserCoords(atual);

          if (pontoDestino) {
            const coordDestino = normalizarCoord(pontoDestino.py, pontoDestino.px);
            if (coordDestino) {
              const dist = calcularDistanciaMetros(
                atual.latitude,
                atual.longitude,
                coordDestino.latitude,
                coordDestino.longitude
              );

              if (dist <= 200) {
                const nome = pontoDestino.np;
                setPontoDestino(null);
                await dispararAlertaMobilidade(
                  "Prepare-se para descer!",
                  `Você está a ${dist}m do ponto ${nome}.`
                );
              }
            }
          }
        }
      );
    }

    iniciarMonitoramentoDescida();
    return () => {
      if (subscription) subscription.remove();
    };
  }, [pontoDestino]);

  async function handleBuscarLinhas() {
    if (!termo.trim()) return;
    setLoading(true);
    setStatusMsg("");
    setLinhaAtiva(null);
    setVeiculos([]);
    setParadasLinha([]);

    try {
      const res = await buscarLinhas(termo);
      setLinhas(res);
      if (res.length === 0) setStatusMsg("Nenhuma linha encontrada.");
    } catch {
      setStatusMsg("Erro ao buscar linhas na API SPTrans.");
    } finally {
      setLoading(false);
    }
  }

  async function selecionarLinha(linha) {
    setLoading(true);
    setStatusMsg("");
    setLinhaAtiva(linha);

    try {
      const [pos, paradas] = await Promise.all([
        buscarPosicaoLinha(linha.cl),
        buscarParadasPorLinha(linha.cl)
      ]);

      const veiculosValidos = (pos.vs || [])
        .map((v) => {
          const coord = normalizarCoord(v.py, v.px);
          return coord ? { ...v, coord } : null;
        })
        .filter(Boolean);

      const paradasValidas = (paradas || [])
        .map((p) => {
          const coord = normalizarCoord(p.py, p.px);
          return coord ? { ...p, coord } : null;
        })
        .filter(Boolean);

      setVeiculos(veiculosValidos);
      setParadasLinha(paradasValidas);

      if (veiculosValidos.length === 0) {
        setStatusMsg(
          `Linha ${linha.lt} sem ônibus circulando neste horário (${pos.hr}).`
        );
      } else {
        setStatusMsg(
          `Linha ${linha.lt} • ${veiculosValidos.length} ônibus ativos (${pos.hr})`
        );
      }
    } catch {
      setStatusMsg("Erro ao carregar posição ou paradas da linha.");
    } finally {
      setLoading(false);
    }
  }

  const veiculosFiltrados = useMemo(
    () => (apenasAcessiveis ? veiculos.filter((v) => Boolean(v.a)) : veiculos),
    [veiculos, apenasAcessiveis]
  );

  const regiaoMapa = useMemo(() => {
    if (veiculosFiltrados.length > 0) {
      return {
        latitude: veiculosFiltrados[0].coord.latitude,
        longitude: veiculosFiltrados[0].coord.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04
      };
    }
    if (paradasLinha.length > 0) {
      return {
        latitude: paradasLinha[0].coord.latitude,
        longitude: paradasLinha[0].coord.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04
      };
    }
    if (userCoords) {
      return {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04
      };
    }
    return SP_CENTER;
  }, [veiculosFiltrados, paradasLinha, userCoords]);

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={termo}
          onChangeText={setTermo}
          placeholder="Ex: 8000, Lapa, Paulista..."
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }
          ]}
        />
        <TouchableOpacity
          onPress={handleBuscarLinhas}
          style={[styles.searchBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setApenasAcessiveis(!apenasAcessiveis)}
        style={[styles.filterBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
      >
        <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600" }}>
          {apenasAcessiveis ? "☑" : "☐"} Filtrar apenas ônibus acessíveis (♿)
        </Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {statusMsg ? (
        <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "600" }}>
          {statusMsg}
        </Text>
      ) : null}

      {pontoDestino ? (
        <View style={[styles.alertBanner, { borderColor: theme.primary, backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.text, fontSize: 12, flex: 1 }}>
            Monitorando descida: <Text style={{ fontWeight: "800" }}>{pontoDestino.np}</Text>
          </Text>
          <TouchableOpacity onPress={() => setPontoDestino(null)}>
            <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 12 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {linhaAtiva ? (
        <View style={{ flex: 1, gap: 8 }}>
          <MapView
            style={styles.map}
            region={regiaoMapa}
            showsUserLocation
            showsMyLocationButton
          >
            {veiculosFiltrados.map((v) => {
              const cor = v.a ? "#10b981" : "#ed145b";
              return (
                <React.Fragment key={`bus-group-${v.p}`}>
                  <Circle
                    center={v.coord}
                    radius={70}
                    strokeColor={cor}
                    strokeWidth={2}
                    fillColor={v.a ? "rgba(16, 185, 129, 0.22)" : "rgba(237, 20, 91, 0.22)"}
                  />
                  <Marker
                    coordinate={v.coord}
                    title={`Prefixo ${v.p}`}
                    description={v.a ? "Veículo acessível (♿)" : "Ônibus em operação"}
                    pinColor={cor}
                  />
                </React.Fragment>
              );
            })}

            {paradasLinha.map((p) => (
              <Marker
                key={`stop-${p.cp}`}
                coordinate={p.coord}
                title={p.np}
                description="Toque no balão para marcar como ponto de descida"
                pinColor="#3b82f6"
                onCalloutPress={() => setPontoDestino(p)}
              />
            ))}
          </MapView>

          <TouchableOpacity
            onPress={() => setLinhaAtiva(null)}
            style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13 }}>
              Voltar para a lista de linhas
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={linhas}
          keyExtractor={(item) => String(item.cl)}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => selecionarLinha(item)}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={{ color: theme.primary, fontWeight: "800", fontSize: 15 }}>
                {item.lt} {item.sl === 1 ? "(Sentido Principal)" : "(Sentido Secundário)"}
              </Text>
              <Text style={{ color: theme.text, fontSize: 12, marginTop: 4 }}>
                {item.tp} → {item.ts}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                Toque para abrir o mapa em tempo real e paradas
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, gap: 10 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  searchBtn: { paddingHorizontal: 16, justifyContent: "center", borderRadius: 10 },
  filterBtn: { borderWidth: 1, borderRadius: 8, padding: 10 },
  alertBanner: { borderWidth: 1.5, borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center" },
  map: { flex: 1, borderRadius: 12, minHeight: 280 },
  backBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  card: { borderWidth: 1.5, borderRadius: 12, padding: 12 }
});