// services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
export async function login(email, password) {
  if (!email || !password) {
    throw new Error("E-mail e senha são obrigatórios.");
  }
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email, password, nome) {
  if (!email || !password || !nome) {
    throw new Error("Nome, e-mail e senha são obrigatórios.");
  }

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const { uid } = userCredential.user;

  await setDoc(doc(db, "users", uid), {
    nome,
    email,
    estilos: [],
    createdAt: new Date(),
  });

  return userCredential;
}

export async function logout() {
  return await signOut(auth);
}

export async function salvarEstilos(uid, estilos) {
  if (!uid) throw new Error("UID do usuário é obrigatório");
  if (!Array.isArray(estilos)) throw new Error("Estilos devem ser um array");

  await updateDoc(doc(db, "users", uid), { estilos });
}

// --- Peças ---
export async function salvarPeca(uid, peca) {
  if (!uid) throw new Error("Usuário não autenticado");
  if (!peca?.categoria) throw new Error("Categoria da peça é obrigatória");

  const docRef = await addDoc(collection(db, "pecas"), {
    uid,
    categoria: peca.categoria,
    tipo: peca.tipo?.trim() || "",
    cor: peca.cor?.trim() || "",
    estilo: peca.estilo?.trim() || "",
    tecido: peca.tecido?.trim() || "",
    estampa: peca.estampa || "nao",
    descricaoEstampa: peca.descricaoEstampa?.trim() || "",
    textura: peca.textura?.trim() || "",
    imageUrl: peca.imageUrl || peca.uri || "",
    createdAt: new Date(),
  });

  return docRef.id;
}

export async function carregarPecas(uid) {
  if (!uid) {
    return { superior: [], inferior: [], unica: [], sapato: [] };
  }

  const pecas = {
    superior: [],
    inferior: [],
    unica: [],
    sapato: [],
  };

  try {
    const q = query(collection(db, "pecas"), where("uid", "==", uid));
    const snapshot = await getDocs(q);

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const { categoria } = data;

      if (["superior", "inferior", "unica", "sapato"].includes(categoria)) {
        pecas[categoria].push({
          id: docSnapshot.id,
          // ✅ Garante que `uri` exista para uso no <Image>
          uri: data.imageUrl || null,
          categoria: data.categoria || categoria,
          tipo: data.tipo || "",
          cor: data.cor || "",
          estilo: data.estilo || "",
          tecido: data.tecido || "",
          estampa: data.estampa || "nao",
          descricaoEstampa: data.descricaoEstampa || "",
          textura: data.textura || "",
        });
      }
    });

    return pecas;
  } catch (error) {
    console.error("Erro ao carregar peças do Firestore:", error);
    throw new Error("Falha ao carregar guarda-roupa.");
  }
}

export async function excluirPeca(pecaId) {
  if (!pecaId) throw new Error("ID da peça é obrigatório");
  await deleteDoc(doc(db, "pecas", pecaId));
}

// --- Looks ---
export async function salvarLook(uid, lookData) {
  if (!uid) throw new Error("UID é obrigatório");
  if (!lookData || !Array.isArray(lookData.pecas)) {
    throw new Error("Dados do look inválidos: 'pecas' deve ser um array.");
  }

  const lookSanitizado = {
    ocasiao: (lookData.ocasiao || "").trim(),
    lugar: (lookData.lugar || "").trim(),
    createdAt: lookData.createdAt || new Date(),
    pecas: lookData.pecas.map((p) => ({
      id: p.id || "",
      categoria: p.categoria || "",
      tipo: p.tipo || "",
      cor: p.cor || "",
      estilo: p.estilo || "",
      tecido: p.tecido || "",
      imageUrl: p.imageUrl || p.uri || "", // ✅ aceita ambas
    })),
  };

  const looksRef = collection(db, "users", uid, "looks");
  const docRef = await addDoc(looksRef, lookSanitizado);
  return docRef.id;
}