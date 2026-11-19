const BASE_URL = "https://api.olhovivo.sptrans.com.br/v2.1";

async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    credentials: "include"
  });

  if (response.status === 401) {
    throw new Error("SESSAO_EXPIRADA");
  }

  if (!response.ok) {
    const err = new Error(`Erro HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const text = await response.text();
  if (!text || !text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function autenticarSPTrans(token) {
  const response = await fetch(
    `${BASE_URL}/Login/Autenticar?token=${encodeURIComponent(token.trim())}`,
    {
      method: "POST",
      credentials: "include"
    }
  );

  const text = (await response.text()).trim().toLowerCase();
  if (!response.ok || text !== "true") {
    throw new Error("Token inválido ou recusado pela API SPTrans.");
  }
  return true;
}

export async function buscarLinhas(termo) {
  const data = await apiGet(`/Linha/Buscar?termosBusca=${encodeURIComponent(termo)}`);
  return Array.isArray(data) ? data : [];
}

export async function buscarPosicaoLinha(codigoLinha) {
  const data = await apiGet(`/Posicao/Linha?codigoLinha=${encodeURIComponent(codigoLinha)}`);
  return {
    hr: data?.hr || "--:--",
    vs: Array.isArray(data?.vs) ? data.vs : []
  };
}

export async function buscarParadas(termo) {
  const data = await apiGet(`/Parada/Buscar?termosBusca=${encodeURIComponent(termo)}`);
  return Array.isArray(data) ? data : [];
}

export async function buscarParadasPorLinha(codigoLinha) {
  const data = await apiGet(
    `/Parada/BuscarParadasPorLinha?codigoLinha=${encodeURIComponent(codigoLinha)}`
  );
  return Array.isArray(data) ? data : [];
}

export async function buscarPrevisaoParada(codigoParada) {
  const data = await apiGet(`/Previsao/Parada?codigoParada=${encodeURIComponent(codigoParada)}`);
  return {
    hr: data?.hr || "--:--",
    ponto: data?.p || null
  };
}

export async function listarCorredores() {
  const data = await apiGet("/Corredor");
  return Array.isArray(data) ? data : [];
}