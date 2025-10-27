// screens/Perfil.js
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

export default function Perfil({ }) {
  const navigation = useNavigation();
  const handleEditarEstilos = () => {
    navigation.navigate('SelecaoEstilos');
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Meu Perfil</Text>
      <Text>Email: {auth.currentUser?.email}</Text>
      <Button title="✏️ Editar gostos" onPress={handleEditarEstilos} />
      <Button title="👀 Looks salvos" onPress={() => Alert.alert('Looks', 'Em breve!')} />
      <Button title="Sair da conta" onPress={handleLogout} color="#f44336" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 }
});