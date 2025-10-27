// screens/GuardaRoupa.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../firebaseConfig';
import { salvarPeca, carregarPecas } from '../services/authService';
import { useNavigation } from '@react-navigation/native';

export default function GuardaRoupa({}) {
  const navigation = useNavigation();
  const [pecas, setPecas] = useState({
    superior: [],
    inferior: [],
    sapato: []
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [imagemUri, setImagemUri] = useState(null);
  const [tipo, setTipo] = useState('superior'); // categoria: superior/inferior/sapato
  const [tipoEspecifico, setTipoEspecifico] = useState(''); // camisa, calça, etc.
  const [cor, setCor] = useState('');
  const [estilo, setEstilo] = useState('');
  const [tecido, setTecido] = useState('');
  const [loading, setLoading] = useState(false);

  // Carregar peças do usuário logado
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      carregarPecas(uid)
        .then(dados => setPecas(dados))
        .catch(err => {
          console.error('Erro ao carregar peças:', err);
          Alert.alert('Erro', 'Não foi possível carregar seu guarda-roupa.');
        });
    }
  }, []);

  // Solicitar permissões de câmera/galeria
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted' || cameraStatus.status !== 'granted') {
          Alert.alert('Permissões necessárias', 'Precisamos de acesso à câmera e galeria.');
        }
      }
    })();
  }, []);

  const handleAdicionarPeca = () => {
    setImagemUri(null);
    setTipo('superior');
    setTipoEspecifico('');
    setCor('');
    setEstilo('');
    setTecido('');
    setModalVisible(true);
  };

  const selecionarImagem = async (origem) => {
    let result;
    if (origem === 'camera') {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1.5],
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1.5],
        quality: 0.8,
      });
    }

    if (!result.canceled) {
      setImagemUri(result.assets[0].uri);
    }
  };

  const salvarPecaLocal = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Erro', 'Você não está logado.');
      return;
    }

    if (!imagemUri) {
      Alert.alert('Erro', 'Selecione uma imagem.');
      return;
    }
    if (!tipoEspecifico.trim() || !cor.trim() || !estilo.trim() || !tecido.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const peca = {
        categoria: tipo,
        tipo: tipoEspecifico.trim(),
        cor: cor.trim(),
        estilo: estilo.trim(),
        tecido: tecido.trim(),
        imageUrl: imagemUri,
      };

      // Salvar no Firebase (vinculado ao UID do usuário)
      await salvarPeca(uid, peca);

      // Atualizar visualmente (opcional, pois o carregamento é feito do banco)
      setPecas(prev => ({
        ...prev,
        [tipo]: [...prev[tipo], { ...peca, id: Date.now().toString(), uri: imagemUri }]
      }));

      setModalVisible(false);
      Alert.alert('Sucesso', 'Peça adicionada ao seu guarda-roupa!');
    } catch (error) {
      console.error('Erro ao salvar peça:', error);
      Alert.alert('Erro', 'Não foi possível salvar a peça. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👗 Meu Guarda-Roupa</Text>
      <Text style={styles.welcome}>Olá, {auth.currentUser?.email}!</Text>

      <Button title="✨ Sugerir Look com IA" onPress={() => Alert.alert('IA', 'Em desenvolvimento!')} />
      <Button title="+ Adicionar Peça" onPress={handleAdicionarPeca} color="#666" />
      <Button title="Meu Perfil" onPress={() => navigation.navigate('Perfil')} />

      {/* Exibição das roupas por categoria */}
{/* Exibição das roupas por categoria */}
<View style={styles.roupasSection}>
  <Text style={styles.sectionTitle}>Superiores</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {pecas.superior.map(peca => (
      <TouchableOpacity
        key={peca.id}
        onPress={() => handleExcluirPeca(peca.id, 'superior')}
        style={styles.pecaItem}
        activeOpacity={0.8}
      >
        <Image source={{ uri: peca.uri }} style={styles.pecaImage} />
        <Text style={styles.pecaLabel}>{peca.tipo}</Text>
        <Text style={styles.pecaSubLabel}>{peca.cor}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

  <Text style={styles.sectionTitle}>Inferiores</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {pecas.inferior.map(peca => (
      <TouchableOpacity
        key={peca.id}
        onPress={() => handleExcluirPeca(peca.id, 'inferior')}
        style={styles.pecaItem}
        activeOpacity={0.8}
      >
        <Image source={{ uri: peca.uri }} style={styles.pecaImage} />
        <Text style={styles.pecaLabel}>{peca.tipo}</Text>
        <Text style={styles.pecaSubLabel}>{peca.cor}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

  <Text style={styles.sectionTitle}>Sapatos</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {pecas.sapato.map(peca => (
      <TouchableOpacity
        key={peca.id}
        onPress={() => handleExcluirPeca(peca.id, 'sapato')}
        style={styles.pecaItem}
        activeOpacity={0.8}
      >
        <Image source={{ uri: peca.uri }} style={styles.pecaImage} />
        <Text style={styles.pecaLabel}>{peca.tipo}</Text>
        <Text style={styles.pecaSubLabel}>{peca.cor}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

      {/* Modal para adicionar peça */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Adicionar Nova Peça</Text>

          {imagemUri ? (
            <Image source={{ uri: imagemUri }} style={styles.previewImage} />
          ) : (
            <View style={[styles.previewImage, { backgroundColor: '#eee' }]} />
          )}

          <View style={styles.buttonRow}>
            <Button title="📸 Câmera" onPress={() => selecionarImagem('camera')} />
            <Button title="🖼️ Galeria" onPress={() => selecionarImagem('galeria')} />
          </View>

          <Text style={styles.label}>Categoria:</Text>
          <View style={styles.tipoButtons}>
            {['superior', 'inferior', 'sapato'].map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTipo(t)}
                style={[styles.tipoButton, tipo === t && styles.tipoButtonSelected]}
              >
                <Text style={tipo === t ? styles.tipoTextSelected : styles.tipoText}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Tipo (ex: camisa, calça, saia, moletom)"
            value={tipoEspecifico}
            onChangeText={setTipoEspecifico}
          />
          <TextInput
            style={styles.input}
            placeholder="Cor (ex: azul)"
            value={cor}
            onChangeText={setCor}
          />
          <TextInput
            style={styles.input}
            placeholder="Estilo (ex: casual, elegante)"
            value={estilo}
            onChangeText={setEstilo}
          />
          <TextInput
            style={styles.input}
            placeholder="Tecido (ex: algodão, jeans)"
            value={tecido}
            onChangeText={setTecido}
          />

          <Button
            title="✅ Salvar Peça"
            onPress={salvarPecaLocal}
            color="#4CAF50"
            disabled={loading}
          />

          <Button
            title="⬅️ Cancelar"
            onPress={() => setModalVisible(false)}
            color="#999"
            style={{ marginTop: 20 }}
          />
        </View>
      </Modal>
    </View>
  );
}
const handleExcluirPeca = (pecaId, categoria) => {
  Alert.alert(
    'Excluir peça?',
    'Tem certeza que deseja remover esta peça do seu guarda-roupa?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirPeca(pecaId);
            setPecas(prev => ({
              ...prev,
              [categoria]: prev[categoria].filter(peca => peca.id !== pecaId)
            }));
            Alert.alert('Sucesso', 'Peça removida!');
          } catch (error) {
            console.error('Erro ao excluir peça:', error);
            Alert.alert('Erro', 'Não foi possível excluir a peça.');
          }
        }
      }
    ]
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  welcome: { textAlign: 'center', marginVertical: 10, color: '#555' },
  roupasSection: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginVertical: 10 },
  pecaItem: { alignItems: 'center', marginRight: 15, width: 80 },
  pecaImage: { width: 70, height: 100, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  pecaLabel: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  pecaSubLabel: { fontSize: 10, color: '#666', textAlign: 'center' },
  modalContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  previewImage: { width: '100%', height: 200, marginBottom: 20, borderRadius: 8 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  tipoButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  tipoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
  },
  tipoButtonSelected: { backgroundColor: '#000', borderColor: '#000' },
  tipoText: { color: '#000' },
  tipoTextSelected: { color: '#fff', fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
});