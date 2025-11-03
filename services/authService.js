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
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// --- Autenticação ---

/**
 * Realiza login do usuário com email e senha.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

/**
 * Cria uma nova conta de usuário e salva dados básicos no Firestore.
 * @param {string} email
 * @param {string} password
 * @param {string} nome
 * @returns {Promise<UserCredential>}
 */
export async function signup(email, password, nome) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;

  await setDoc(doc(db, "users", uid), {
    nome,
    email,
    estilos: [],
    createdAt: new Date(),
  });

  return userCredential;
}

/**
 * Salva os estilos preferidos do usuário no Firestore.
 * @param {string} uid - ID do usuário autenticado
 * @param {string[]} estilos - Array de estilos (ex: ["casual", "elegante"])
 */
export async function salvarEstilos(uid, estilos) {
  if (!uid) throw new Error("UID do usuário é obrigatório");
  await updateDoc(doc(db, "users", uid), { estilos });
}

// --- Gerenciamento de Peças de Roupa ---

/**
 * Salva uma nova peça no Firestore, vinculada ao UID do usuário.
 * @param {string} uid - ID do usuário autenticado
 * @param {Object} peca - Objeto com dados da peça
 */
export async function salvarPeca(uid, peca) {
  if (!uid) throw new Error("Usuário não autenticado");
  if (!peca?.categoria) throw new Error("Categoria da peça é obrigatória");

  await addDoc(collection(db, "pecas"), {
    uid, // 👈 campo usado para vincular ao usuário
    categoria: peca.categoria,
    tipo: peca.tipo,
    cor: peca.cor,
    estilo: peca.estilo,
    tecido: peca.tecido,
    imageUrl: peca.imageUrl || peca.uri,
    createdAt: new Date(),
  });
}

/**
 * Carrega todas as peças do usuário autenticado, agrupadas por categoria.
 * @param {string} uid - ID do usuário autenticado
 * @returns {Object} - Objeto com arrays: { superior, inferior, unica, sapato }
 */
export async function carregarPecas(uid) {
  if (!uid) {
    return { superior: [], inferior: [], unica: [], sapato: [] };
  }

  const q = query(collection(db, "pecas"), where("uid", "==", uid));
  const snapshot = await getDocs(q);

  const pecas = { superior: [], inferior: [], unica: [], sapato: [] };

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const { categoria } = data;

    if (["superior", "inferior", "unica", "sapato"].includes(categoria)) {
      pecas[categoria].push({
        id: docSnapshot.id,
        uri: data.imageUrl || data.uri || null,
        cor: data.cor || "",
        tipo: data.tipo || "",
        estilo: data.estilo || "",
        tecido: data.tecido || "",
      });
    }
  });

  return pecas;
}

/**
 * Exclui uma peça do Firestore pelo ID do documento.
 * @param {string} pecaId - ID do documento da peça no Firestore
 */
export async function excluirPeca(pecaId) {
  if (!pecaId) throw new Error("ID da peça é obrigatório");
  await deleteDoc(doc(db, "pecas", pecaId));
}