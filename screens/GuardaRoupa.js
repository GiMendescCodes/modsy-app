// screens/GuardaRoupa.js
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { auth } from '../firebaseConfig';

export default function GuardaRoupa({ navigation }) {
  const [loading, setLoading] = useState(false);

  const handleSugerirLook = async () => {
    // Aqui você integrará com seu backend depois
    Alert.alert('IA', 'Funcionalidade de IA em desenvolvimento!');
  };

  const handleAdicionarPeca = () => {
    Alert.alert('Peça', 'Funcionalidade de adicionar peça em desenvolvimento!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👗 Meu Guarda-Roupa</Text>
      <Text style={styles.welcome}>Olá, {auth.currentUser?.email}!</Text>
      
      <Button title="✨ Sugerir Look com IA" onPress={handleSugerirLook} />
      <Button title="+ Adicionar Peça" onPress={handleAdicionarPeca} color="#666" />
      <Button title="Meu Perfil" onPress={() => navigation.navigate('Perfil')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  welcome: { textAlign: 'center', marginVertical: 20, color: '#555' }
});