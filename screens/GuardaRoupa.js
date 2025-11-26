// screens/GuardaRoupa.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  salvarPeca,
  carregarPecas,
  excluirPeca,
  salvarLook,
} from "../services/authService";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import * as FileSystem from "expo-file-system/legacy";

// 🔑 Chaves de API
const REMOVE_BG_API_KEY = "UE1eG4Beq4ortNycER9oH8Bj";
const OPENWEATHER_API_KEY = "0dde739998e257474718498f3369f13c";
const OPENROUTER_API_KEY = "sua_chave_aqui";

export default function GuardaRoupa() {
  const navigation = useNavigation();
  const [pecas, setPecas] = useState({
    superior: [],
    inferior: [],
    unica: [],
    sapato: [],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [imagemUri, setImagemUri] = useState(null);
  const [tipo, setTipo] = useState("superior");
  const [tipoEspecifico, setTipoEspecifico] = useState("");
  const [cor, setCor] = useState("");
  const [estilo, setEstilo] = useState("");
  const [tecido, setTecido] = useState("");
  const [estampa, setEstampa] = useState("");
  const [descricaoEstampa, setDescricaoEstampa] = useState("");
  const [textura, setTextura] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [showSugestaoModal, setShowSugestaoModal] = useState(false);
  const [ocasiao, setOcasiao] = useState("");
  const [cidade, setCidade] = useState("");
  const [iaLoading, setIaLoading] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pecaToDelete, setPecaToDelete] = useState(null);
  const [modoVisualizacao, setModoVisualizacao] = useState("unico"); // "unico" ou "completo"

  // Carregar peças
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      carregarPecas(uid)
        .then((dados) => {
          const normalizePecas = (lista) =>
            lista.map((p) => ({
              ...p,
              uri: p.uri || p.imageUrl,
            }));
          setPecas({
            superior: normalizePecas(dados.superior || []),
            inferior: normalizePecas(dados.inferior || []),
            unica: normalizePecas(dados.unica || []),
            sapato: normalizePecas(dados.sapato || []),
          });
        })
        .catch((err) => {
          console.error("Erro ao carregar peças:", err);
          Alert.alert("Erro", "Não foi possível carregar seu guarda-roupa.");
        });
    }
  }, []);

  // Permissões de mídia
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted" || cameraStatus.status !== "granted") {
          Alert.alert(
            "Permissões necessárias",
            "Precisamos de acesso à câmera e galeria."
          );
        }
      }
    })();
  }, []);

  const fecharModalAdicionarPeca = () => {
    setLoading(false);
    setRemovingBg(false);
    setImagemUri(null);
    setTipo("superior");
    setTipoEspecifico("");
    setCor("");
    setEstilo("");
    setTecido("");
    setEstampa("");
    setDescricaoEstampa("");
    setTextura("");
    setModalVisible(false);
  };

  // --------- FUNÇÕES (IMAGEM, PEÇA, IA, ETC.) - INICIO ---------
  const removeBackground = async (localUri) => {
    if (!localUri || typeof localUri !== "string") {
      Alert.alert("Erro", "Imagem inválida.");
      return null;
    }
    setRemovingBg(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        Alert.alert("Erro", "Arquivo não encontrado.");
        return null;
      }
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": REMOVE_BG_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_file_b64: base64,
          size: "regular",
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro Remove.bg:", errorText);
        Alert.alert("Erro", "Falha ao remover fundo.");
        return localUri;
      }
      const arrayBuffer = await response.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      const base64Image = btoa(binary);
      const outputPath = `${
        FileSystem.cacheDirectory
      }sem_fundo_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(outputPath, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return outputPath;
    } catch (error) {
      console.error("Erro removeBackground:", error);
      Alert.alert("Erro", "Falha ao processar imagem.");
      return localUri;
    } finally {
      setRemovingBg(false);
    }
  };

  const selecionarImagem = async (origem) => {
    let result;
    try {
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      };
      if (origem === "camera") {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }
    } catch (error) {
      console.error("Erro ao abrir seletor:", error);
      Alert.alert("Erro", "Falha ao acessar câmera/galeria.");
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    let uri = result.assets[0].uri;
    if (Platform.OS === "android" && uri.startsWith("content://")) {
      const fileName = uri.split("/").pop() || "imagem.jpg";
      const cacheFileUri = `${FileSystem.cacheDirectory}${fileName}`;
      try {
        await FileSystem.copyAsync({ from: uri, to: cacheFileUri });
        uri = cacheFileUri;
      } catch (copyError) {
        console.error("Erro ao copiar imagem:", copyError);
        Alert.alert("Erro", "Não foi possível carregar a imagem.");
        return;
      }
    }
    if (removingBg) return;
    const imagemProcessada = await removeBackground(uri);
    setImagemUri(imagemProcessada);
  };

  const handleAdicionarPeca = () => {
    setModalVisible(true);
  };

  const salvarPecaLocal = async () => {
    if (!auth.currentUser?.uid) {
      Alert.alert("Erro", "Você não está logado.");
      return;
    }
    const uid = auth.currentUser.uid;
    if (!imagemUri) {
      Alert.alert("Erro", "Selecione uma imagem.");
      return;
    }
    if (!tipoEspecifico.trim() || !cor.trim() || !estilo.trim()) {
      Alert.alert(
        "Erro",
        "Preencha os campos obrigatórios: tipo, cor e estilo."
      );
      return;
    }
    setLoading(true);
    try {
      const peca = {
        categoria: tipo,
        tipo: tipoEspecifico.trim(),
        cor: cor.trim(),
        estilo: estilo.trim(),
        tecido: tecido.trim() || null,
        estampa: estampa,
        descricaoEstampa:
          estampa === "sim" ? descricaoEstampa.trim() || null : null,
        textura: textura.trim() || null,
        imageUrl: imagemUri,
      };
      const pecaId = await salvarPeca(uid, peca);
      setPecas((prev) => ({
        ...prev,
        [tipo]: [...prev[tipo], { ...peca, id: pecaId, uri: imagemUri }],
      }));
      fecharModalAdicionarPeca();
      Alert.alert("Sucesso", "Peça adicionada!");
    } catch (error) {
      console.error("Erro ao salvar peça:", error);
      Alert.alert("Erro", "Não foi possível salvar a peça.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirPeca = (pecaId, categoria) => {
    setPecaToDelete({ id: pecaId, categoria });
    setShowConfirmModal(true);
  };

  const buscarTemperatura = async (cidade) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          cidade
        )}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      if (response.status === 401) {
        console.warn("Chave da OpenWeatherMap inválida.");
        return 22;
      }
      if (response.status === 404) {
        Alert.alert(
          "Cidade não encontrada",
          `Não encontramos a cidade "${cidade}".\nPor favor, digite o nome completo de uma cidade válida (ex: "São Paulo", "Rio de Janeiro").`
        );
        throw new Error("Cidade inválida");
      }
      if (!response.ok) {
        console.warn("Erro na API de clima:", response.status);
        return 22;
      }
      const data = await response.json();
      return data.main?.temp ? Math.round(data.main.temp) : 22;
    } catch (error) {
      console.error("Erro na API de clima:", error);
      if (error.message !== "Cidade inválida") {
        Alert.alert("Erro", "Não foi possível obter a temperatura.");
      }
      return 22;
    }
  };

  const validarLookPorPecas = (pecas) => {
    if (pecas.length === 0) return false;
    const ids = pecas.map((p) => p.id);
    if (new Set(ids).size !== ids.length) return false;
    const categorias = pecas.map((p) => p.categoria);
    const temSapato = categorias.filter((c) => c === "sapato").length === 1;
    const temUnica = categorias.includes("unica");
    const contaSuperior = categorias.filter((c) => c === "superior").length;
    const contaInferior = categorias.filter((c) => c === "inferior").length;
    if (!temSapato) return false;
    if (temUnica) {
      return pecas.length === 2 && contaSuperior === 0 && contaInferior === 0;
    } else {
      return pecas.length === 3 && contaSuperior === 1 && contaInferior === 1;
    }
  };

  const extrairJson = (texto) => {
    const bloco = texto.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (bloco) {
      try {
        return JSON.parse(bloco[1]);
      } catch (e) {}
    }
    const inicio = texto.indexOf("{");
    const fim = texto.lastIndexOf("}");
    if (inicio !== -1 && fim !== -1 && fim > inicio) {
      const candidato = texto.substring(inicio, fim + 1);
      try {
        return JSON.parse(candidato);
      } catch (e) {}
    }
    return null;
  };

  const handleSugerirLook = () => {
    setShowSugestaoModal(true);
  };

  const handleGerarSugestao = async () => {
    if (!ocasiao.trim() || !cidade.trim()) {
      Alert.alert("Atenção", "Preencha ocasião e cidade.");
      return;
    }
    setIaLoading(true);
    setSugestoes([]);

    try {
      let temperatura;
      try {
        temperatura = await buscarTemperatura(cidade.trim());
      } catch (climaError) {
        return;
      }

      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert("Erro", "Você precisa estar logado.");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", uid));
      const estilosUsuario = userDoc.exists()
        ? userDoc.data().estilos || []
        : [];

      const todasPecas = [
        ...pecas.superior,
        ...pecas.inferior,
        ...pecas.unica,
        ...pecas.sapato,
      ];

      if (todasPecas.length === 0) {
        Alert.alert("Atenção", "Seu guarda-roupa está vazio!");
        return;
      }

      const pecasUsadas = todasPecas.slice(0, 20);
      const wardrobeData = pecasUsadas.map((p) => ({
        id: p.id,
        categoria: p.categoria,
        tipo: p.tipo,
        cor: p.cor,
      }));

      const oc = ocasiao.toLowerCase();
      const isAcademia = /academia|treino|fitness|corrida|esporte/.test(oc);

      const wardrobeFiltrado = wardrobeData.filter((p) => {
        if (!isAcademia) return true;

        const tipo = (p.tipo || "").toLowerCase();
        const cat = (p.categoria || "").toLowerCase();

        // Remove tudo que é absurdo para academia
        if (
          tipo.includes("saia") ||
          tipo.includes("jeans") ||
          tipo.includes("couro") ||
          tipo.includes("salto") ||
          tipo.includes("vestido") ||
          tipo.includes("blazer") ||
          tipo.includes("social")
        )
          return false;

        // Só aceita tênis como sapato
        if (cat === "sapato" && !/tênis|tenis|esportivo/.test(tipo))
          return false;

        return true;
      });

      const prompt = `Crie 3 looks para: "${ocasiao}". 
Regras: 
- Cada look: (1 "unica" + 1 "sapato") ou (1 "superior" + 1 "inferior" + 1 "sapato"). 
- Sempre exatamente 1 sapato. 
- Considere sempre a ocasião que a pessoa vai usar o look.(ex: academia/esportes precisa de roupas confortáveis e esportivas, casamento/trabalhos precisa de roupas formais e elegantes).
- Use só estes IDs: ${wardrobeFiltrado.map((p) => p.id).join(", ")}.
- Saída: só JSON com "looks": [{"pecas":[{"id":"..."}], "explicacao":"frase curta"}].`;

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://meu-guarda-roupa.app",
            "X-Title": "Meu Guarda-Roupa",
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct:free",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro OpenRouter:", errorText);
        if (response.status === 401) {
          Alert.alert("Erro", "Chave da OpenRouter inválida ou sem saldo.");
        } else if (errorText.includes("context_length_exceeded")) {
          Alert.alert("Erro", "Muitas peças! Use menos de 20.");
        } else {
          Alert.alert("Erro", `Falha na IA: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) throw new Error("Resposta vazia da IA");

      let result = null;
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        result = extrairJson(rawText);
      }

      if (!result || !result.looks || !Array.isArray(result.looks)) {
        throw new Error("Formato de resposta inválido");
      }

      const lookup = {};
      pecasUsadas.forEach((p) => {
        const imageUrl = p.imageUrl || p.uri || null;
        lookup[p.id] = {
          ...p,
          uri: imageUrl,
          imageUrl,
        };
      });

      const looksValidos = [];
      for (const look of result.looks) {
        if (!look.pecas || !Array.isArray(look.pecas)) continue;
        const pecasValidas = look.pecas
          .map((item) => lookup[item.id])
          .filter(Boolean);
        if (pecasValidas.length === 0) continue;
        const categorias = pecasValidas.map((p) => p.categoria);
        const temSapato = categorias.includes("sapato");
        const temMinimoPecas = pecasValidas.length >= 2;
        if (temSapato && temMinimoPecas) {
          looksValidos.push({
            pecas: pecasValidas,
            explicacao: look.explicacao || "Look sugerido pela IA.",
          });
        }
      }

      if (looksValidos.length < 3) {
        const fallbackLooks = gerarLooksFallback(todasPecas);
        const combined = [...looksValidos, ...fallbackLooks].slice(0, 3);
        setSugestoes(combined);
      } else {
        setSugestoes(looksValidos.slice(0, 3));
      }
    } catch (error) {
      console.error("Erro ao gerar sugestão:", error);
      Alert.alert("Erro", "Não foi possível gerar o look.");
    } finally {
      setIaLoading(false);
    }
  };

  // ✅ Funções no escopo correto do componente (fora de handleGerarSugestao)
  const gerarLooksFallback = (todasPecas) => {
    const superiores = todasPecas.filter((p) => p.categoria === "superior");
    const inferiores = todasPecas.filter((p) => p.categoria === "inferior");
    const unicas = todasPecas.filter((p) => p.categoria === "unica");
    const sapatos = todasPecas.filter((p) => p.categoria === "sapato");

    const looks = [];

    for (
      let i = 0;
      i < 3 && superiores[i] && inferiores[i] && sapatos[i];
      i++
    ) {
      looks.push({
        pecas: [superiores[i], inferiores[i], sapatos[i]],
        explicacao: "Combinação prática sugerida automaticamente.",
      });
    }

    if (looks.length < 3) {
      for (
        let i = 0;
        i < 3 && looks.length < 3 && unicas[i] && sapatos[i];
        i++
      ) {
        looks.push({
          pecas: [unicas[i], sapatos[i]],
          explicacao: "Look com peça única sugerido automaticamente.",
        });
      }
    }

    return looks;
  };

  const handleSalvarLook = async (look) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Erro", "Você não está logado.");
      return;
    }
    try {
      const lookData = {
        pecas: look.pecas.map((p) => ({
          id: p.id,
          categoria: p.categoria,
          tipo: p.tipo || "",
          cor: p.cor || "",
          estilo: p.estilo || "",
          tecido: p.tecido || "",
          imageUrl: p.uri || p.imageUrl || "",
        })),
        ocasiao: ocasiao.trim(),
        cidade: cidade.trim(),
        createdAt: new Date(),
      };
      await salvarLook(uid, lookData);
      Alert.alert("Sucesso", "Look salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar look:", error);
      Alert.alert("Erro", "Não foi possível salvar o look.");
    }
  };

  // --------- FUNÇÕES - FIM ---------

  return (
    <View style={styles.container}>
      {/* Cabeçalho Personalizado */}
      {/* Cabeçalho Personalizado */}
      {/* Cabeçalho Personalizado */}
      <View style={styles.header}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.searchBarContainer}
            onPress={handleSugerirLook}
            activeOpacity={0.7}
          >
            <Text style={styles.searchPlaceholder}>Montar outfit...</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAdicionarPeca}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() =>
              setModoVisualizacao(
                modoVisualizacao === "unico" ? "completo" : "unico"
              )
            }
          >
            <View style={styles.toggleIcon}>
              {/* Sempre mostra pelo menos 2 linhas */}
              <View style={styles.toggleLine} />
              <View style={[styles.toggleLine, { marginTop: 2 }]} />
              {/* Terceira linha só no modo "completo" */}
              {modoVisualizacao === "completo" && (
                <View style={[styles.toggleLine, { marginTop: 2 }]} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categorias de Peças */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {modoVisualizacao === "completo" ? (
          <>
            {/* Andar 1: Superiores */}
            <View style={styles.andarContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roupasRow}
              >
                {pecas.superior.map((peca) => (
                  <TouchableOpacity
                    key={peca.id}
                    style={styles.pecaItemGrande}
                    onPress={() => handleExcluirPeca(peca.id, "superior")}
                  >
                    <Image
                      source={{ uri: peca.uri || peca.imageUrl }}
                      style={styles.pecaImageGrande}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Andar 2: Inferiores */}
            <View style={styles.andarContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roupasRow}
              >
                {pecas.inferior.map((peca) => (
                  <TouchableOpacity
                    key={peca.id}
                    style={styles.pecaItemGrande}
                    onPress={() => handleExcluirPeca(peca.id, "inferior")}
                  >
                    <Image
                      source={{ uri: peca.uri || peca.imageUrl }}
                      style={styles.pecaImageGrande}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        ) : (
          <>
            {/* Andar 1: Peças Únicas */}
            <View style={styles.andarContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roupasRow}
              >
                {pecas.unica.map((peca) => (
                  <TouchableOpacity
                    key={peca.id}
                    style={styles.pecaItemUnicaGrande}
                    onPress={() => handleExcluirPeca(peca.id, "unica")}
                  >
                    <Image
                      source={{ uri: peca.uri || peca.imageUrl }}
                      style={styles.pecaImageUnicaGrande}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* Andar 2 ou 3: Sapatos (sempre aparece) */}
        <View style={styles.andarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roupasRow}
          >
            {pecas.sapato.map((peca) => (
              <TouchableOpacity
                key={peca.id}
                style={styles.pecaItemPequeno}
                onPress={() => handleExcluirPeca(peca.id, "sapato")}
              >
                <Image
                  source={{ uri: peca.uri || peca.imageUrl }}
                  style={styles.pecaImagePequeno}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Barra de Navegação Inferior */}
      {/* Barra de Navegação Inferior */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonActive]}
          onPress={() => navigation.navigate("GuardaRoupa")}
        >
          <Image
            source={require("../assets/cabide.png")}
            style={styles.navIcon1}
          />
          <Text style={styles.navButtonTextActive}>Guarda-roupa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("Perfil")}
        >
          <Image
            source={require("../assets/perfil.png")}
            style={styles.navIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Modal: Adicionar Peça */}
      {modalVisible && (
        <View style={styles.overlayBottom} pointerEvents="box-none">
          <View
            style={styles.overlayTouchable}
            onTouchEnd={fecharModalAdicionarPeca}
          />
          <View style={styles.modalBottomSheet} pointerEvents="auto">
            <ScrollView
              contentContainerStyle={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>
                Selecione uma foto de sua peça de roupa:
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={() => selecionarImagem("galeria")}
                >
                  <Image
                    source={require("../assets/galeria.png")}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>GALERIA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => selecionarImagem("camera")}
                >
                  <Image
                    source={require("../assets/camera.png")}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>CÂMERA</Text>
                </TouchableOpacity>
              </View>
              {imagemUri && (
                <Image
                  source={{ uri: imagemUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.label}>Categoria:</Text>
              <View style={styles.tipoButtons}>
                {["superior", "inferior", "unica", "sapato"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTipo(t)}
                    style={[
                      styles.tipoButton,
                      tipo === t && styles.tipoButtonSelected,
                    ]}
                  >
                    <Text
                      style={
                        tipo === t ? styles.tipoTextSelected : styles.tipoText
                      }
                    >
                      {t === "unica" ? "única" : t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Tipo(ex: vestido, camisa)*"
                value={tipoEspecifico}
                onChangeText={setTipoEspecifico}
                placeholderTextColor="#ddd"
              />
              <TextInput
                style={styles.input}
                placeholder="Cor*"
                value={cor}
                onChangeText={setCor}
                placeholderTextColor="#ddd"
              />
              <TextInput
                style={styles.input}
                placeholder="Estilo(old school, gotico, esportivo)*"
                value={estilo}
                onChangeText={setEstilo}
                placeholderTextColor="#ddd"
              />
              <TextInput
                style={styles.input}
                placeholder="Tecido(opcional)"
                value={tecido}
                onChangeText={setTecido}
                placeholderTextColor="#ddd"
              />
              <Text style={styles.label}>Tem estampa?*</Text>
              <View style={styles.estampaButtons}>
                <TouchableOpacity
                  style={[
                    styles.estampaButton,
                    estampa === "sim" && styles.estampaButtonSelected,
                  ]}
                  onPress={() => setEstampa("sim")}
                >
                  <Text
                    style={[
                      styles.estampaButtonText,
                      estampa === "sim" && styles.estampaButtonTextSelected,
                    ]}
                  >
                    SIM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.estampaButton,
                    estampa === "nao" && styles.estampaButtonSelected,
                  ]}
                  onPress={() => {
                    setEstampa("nao");
                    setDescricaoEstampa("");
                  }}
                >
                  <Text
                    style={[
                      styles.estampaButtonText,
                      estampa === "nao" && styles.estampaButtonTextSelected,
                    ]}
                  >
                    NÃO
                  </Text>
                </TouchableOpacity>
              </View>
              {estampa === "sim" && (
                <TextInput
                  style={styles.input}
                  placeholder="Descreva a estampa (opcional)"
                  value={descricaoEstampa}
                  onChangeText={setDescricaoEstampa}
                  placeholderTextColor="#ddd"
                />
              )}
              <TouchableOpacity
                style={[
                  styles.enviarButton,
                  (loading || removingBg) && styles.enviarButtonDisabled,
                ]}
                onPress={salvarPecaLocal}
                disabled={loading || removingBg}
              >
                {loading || removingBg ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.enviarButtonText}>ENVIAR</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelarButton}
                onPress={fecharModalAdicionarPeca}
              >
                <Text style={styles.cancelarButtonText}>CANCELAR</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal: Sugerir Look */}
      <Modal
        visible={showSugestaoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSugestaoModal(false)}
      >
        <View style={styles.overlayCentral}>
          <View style={styles.modalBox}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSugestaoModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 30 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sugestaoModalTitle}>Montar outfit</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ocasião</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Ex: casamento, happy hour, trabalho"
                  value={ocasiao}
                  onChangeText={setOcasiao}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cidade</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Ex: São Paulo, Rio de Janeiro"
                  value={cidade}
                  onChangeText={setCidade}
                  placeholderTextColor="#888"
                />
                <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  Digite o nome da cidade para ajustar à temperatura local
                </Text>
              </View>

              <TouchableOpacity
                style={styles.enviarButton}
                onPress={handleGerarSugestao}
                disabled={iaLoading}
              >
                {iaLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.enviarButtonText}>Enviar</Text>
                )}
              </TouchableOpacity>

              {sugestoes.length > 0 && (
                <>
                  <Text style={styles.resultTitle}>Looks Sugeridos:</Text>
                  {sugestoes.map((look, index) => (
                    <View key={index} style={styles.lookItem}>
                      <Text style={styles.explicacao}>{look.explicacao}</Text>
                      <View style={styles.lookPecas}>
                        {look.pecas.map((peca, i) => {
                          const imgUri = peca.uri || peca.imageUrl;
                          return (
                            <View
                              key={i}
                              style={{
                                alignItems: "center",
                                marginHorizontal: 4,
                              }}
                            >
                              {imgUri ? (
                                <Image
                                  source={{ uri: imgUri }}
                                  style={styles.lookPecaImage}
                                  onError={() =>
                                    console.warn("Falha ao carregar:", imgUri)
                                  }
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.lookPecaImage,
                                    {
                                      backgroundColor: "#eee",
                                      justifyContent: "center",
                                    },
                                  ]}
                                >
                                  <Text style={{ fontSize: 10, color: "#999" }}>
                                    {peca.tipo?.slice(0, 6) || "sem img"}
                                  </Text>
                                </View>
                              )}
                              <Text
                                style={{
                                  fontSize: 10,
                                  marginTop: 2,
                                  color: "#333",
                                }}
                              >
                                {peca.tipo}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      <TouchableOpacity
                        style={styles.salvarLookButton}
                        onPress={() => handleSalvarLook(look)}
                      >
                        <Text style={styles.salvarLookButtonText}>
                          Salvar Look
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Confirmação de Exclusão */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.overlayCentral}>
          <View style={styles.confirmModalBox}>
            <Text style={styles.confirmModalTitle}>
              Tem certeza que deseja apagar esse item?
            </Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={async () => {
                if (!pecaToDelete) return;
                try {
                  await excluirPeca(pecaToDelete.id);
                  setPecas((prev) => ({
                    ...prev,
                    [pecaToDelete.categoria]: prev[
                      pecaToDelete.categoria
                    ].filter((peca) => peca.id !== pecaToDelete.id),
                  }));
                  Alert.alert("Sucesso", "Peça removida!");
                } catch (error) {
                  console.error("Erro ao excluir:", error);
                  Alert.alert("Erro", "Não foi possível excluir.");
                } finally {
                  setShowConfirmModal(false);
                  setPecaToDelete(null);
                }
              }}
            >
              <Text style={styles.confirmButtonText}>Sim</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                setShowConfirmModal(false);
                setPecaToDelete(null);
              }}
            >
              <Text style={styles.confirmButtonText}>Não</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingBottom: 80,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: 15,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  searchAddRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: "#666",
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#A89CF2",
    fontSize: 24,
    fontWeight: "bold",
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  categoriaContainer: {
    marginBottom: 20,
  },
  categoriaTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  roupasRow: {},
  pecaItem: {
    alignItems: "center",
    marginRight: 15,
    width: 100,
    height: 160, // altura fixa para todas as peças
  },
  pecaImage: {
    width: 90,
    height: 120,
    resizeMode: "contain",
    marginBottom: 8,
    borderRadius: 8,
  },
  pecaItemUnica: {
    width: 100, // mesma largura
    height: 160, // mesma altura!
  },
  pecaImageUnica: {
    width: 90,
    height: 120, // mesma altura da imagem normal
  },
  pecaLabel: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  pecaSubLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    borderRadius: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 60,
    marginLeft: 70,
    width: "58%",
    height: 65,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  navButtonActive: {
    backgroundColor: "#A89CF2",
    width: 160,
    height: 48,
    borderRadius: 55,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    marginLeft: -5,
  },
  navIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  navIcon1: {
    width: 25,
    height: 17,
    marginRight: 5,
  },
  navButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  navButtonTextActive: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  overlayCentral: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  overlayBottom: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  overlayTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  modalBottomSheet: {
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
    maxHeight: "80%",
    marginTop: 60,
  },
  modalScrollView: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#fff",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  galleryButton: {
    flex: 1,
    backgroundColor: "#A89CF2",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 5,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: "#A89CF2",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginLeft: 5,
  },
  buttonIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  previewImage: {
    width: "100%",
    height: 150,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    color: "#fff",
  },
  tipoButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  tipoButton: {
    backgroundColor: "#444",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#666",
  },
  tipoButtonSelected: {
    backgroundColor: "#A89CF2",
    borderColor: "#A89CF2",
  },
  tipoText: {
    color: "#fff",
    fontSize: 14,
  },
  tipoTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#333",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  estampaButtons: {
    flexDirection: "row",
    marginBottom: 15,
  },
  estampaButton: {
    flex: 1,
    backgroundColor: "#444",
    borderRadius: 15,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  estampaButtonSelected: {
    backgroundColor: "#A89CF2",
  },
  estampaButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  estampaButtonTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  enviarButton: {
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  enviarButtonDisabled: {
    backgroundColor: "#ccc",
  },
  enviarButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
  cancelarButton: {
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  cancelarButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
  modalBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#A89CF2",
    borderRadius: 20,
    padding: 25,
    position: "relative",
    maxHeight: "90%",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  sugestaoModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#000",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    color: "#000",
  },
  inputField: {
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  sugestoesContainer: {
    flex: 1,
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#000",
  },
  lookItem: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  explicacao: {
    fontSize: 14,
    marginBottom: 10,
    fontStyle: "italic",
    color: "#000",
  },
  lookPecas: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  lookPecaImage: {
    width: 60,
    height: 80,
    resizeMode: "contain",
  },
  andarContainer: {
    marginBottom: -50, // ← bem mais próximo (ajuste entre 4 e 10 conforme preferir)
    paddingHorizontal: 20,
  },
  roupasRow: {
    // mantém como está
  },
  // Peças grandes (superior, inferior)
  pecaItemGrande: {
    alignItems: "center",
    marginRight: 20,
    width: 120,
    height: 180,
  },
  pecaImageGrande: {
    width: 110,
    height: 150,
    resizeMode: "contain",
    borderRadius: 10,
  },
  // Peças únicas (duplas, ocupam duas linhas)
  pecaItemDuplo: {
    alignItems: "center",
    marginRight: 20,
    width: 120,
    height: 360, // dobro da altura das outras peças
  },
  pecaImageDuplo: {
    width: 110,
    height: 300, // dobro da altura da imagem normal
    resizeMode: "contain",
    borderRadius: 10,
  },
  // Sapatos menores
  pecaItemPequeno: {
    alignItems: "center",
    marginRight: 15,
    width: 80,
    height: 100,
  },
  pecaImagePequeno: {
    width: 70,
    height: 80,
    resizeMode: "contain",
    borderRadius: 8,
  },
  salvarLookButton: {
    backgroundColor: "#2196F3",
    padding: 8,
    borderRadius: 5,
    alignItems: "center",
  },
  salvarLookButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  confirmModalBox: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#A89CF2",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#fff",
  },
  confirmButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  // Estilos para o botão de toggle
  toggleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleIcon: {
    width: 20,
    height: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLine: {
    width: 16,
    height: 2,
    backgroundColor: "#A89CF2",
    borderRadius: 1,
  },
});
