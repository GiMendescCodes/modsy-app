// services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc // ✅ Importante: adicione deleteDoc aqui
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// --- Autenticação ---
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email, password, nome) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;
  await setDoc(doc(db, "users", user.uid), {
    nome,
    email,
    estilos: [],
  });
  return userCredential;
}

export async function salvarEstilos(uid, estilos) {
  await updateDoc(doc(db, "users", uid), { estilos });
}

// --- Roupas ---
export async function salvarPeca(uid, peca) {
  if (!uid) throw new Error("Usuário não autenticado");

  const pecasRef = collection(db, "pecas");
  await addDoc(pecasRef, {
    uid,
    ...peca,
    createdAt: new Date(),
  });
}

export async function carregarPecas(uid) {
  if (!uid) return { superior: [], inferior: [], sapato: [] };

  const q = query(collection(db, "pecas"), where("uid", "==", uid));
  const snapshot = await getDocs(q);

  const pecas = { superior: [], inferior: [], sapato: [] };
  snapshot.forEach((doc) => {
    const data = doc.data();
    const categoria = data.categoria;
    if (
      categoria === "superior" ||
      categoria === "inferior" ||
      categoria === "sapato"
    ) {
      pecas[categoria].push({
        id: doc.id,
        uri: data.imageUrl,
        cor: data.cor,
        tipo: data.tipo,
        estilo: data.estilo,
        tecido: data.tecido,
      });
    }
  });
  return pecas;
} // ✅ Fecha carregarPecas aqui

// ✅ Função excluirPeca fora de qualquer outra função
export async function excluirPeca(pecaId) {
  const pecaRef = doc(db, "pecas", pecaId);
  await deleteDoc(pecaRef);
}