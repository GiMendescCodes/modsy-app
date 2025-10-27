// services/authService.js
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email, password, nome) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await setDoc(doc(db, 'users', user.uid), {
    nome,
    email,
    estilos: []
  });
  return userCredential;
}

export async function salvarEstilos(uid, estilos) {
  await updateDoc(doc(db, 'users', uid), { estilos });
}