import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  nickname: string;
  signInWithGoogle: () => Promise<void>;
  signInAsAdmin: (id: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateNickname: (newNickname: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          setIsAdmin(currentUser.email === 'admin@30fc.club');
          
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              const initialNickname = (currentUser.displayName || 'Pemain').substring(0, 6);
              await setDoc(userRef, {
                displayName: currentUser.displayName || 'Unknown',
                nickname: initialNickname,
                email: currentUser.email || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              setNickname(initialNickname);
            } else {
              setNickname(userSnap.data().nickname || userSnap.data().displayName?.substring(0, 6) || 'Pemain');
            }
          } catch (error: any) {
            console.error(error);
          }
        } else {
          setIsAdmin(false);
          setNickname('');
        }
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const updateNickname = async (newNickname: string) => {
    if (!user) return;
    const cleanNickname = newNickname.trim().substring(0, 6);
    await setDoc(doc(db, 'users', user.uid), { 
      nickname: cleanNickname,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setNickname(cleanNickname);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInAsAdmin = async (id: string, pin: string) => {
    if (id !== 'admin' || pin !== 'admin123') {
      throw new Error('Invalid Admin Credentials');
    }
    const adminEmail = 'admin@30fc.club';
    try {
      await signInWithEmailAndPassword(auth, adminEmail, pin);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        const cred = await createUserWithEmailAndPassword(auth, adminEmail, pin);
        await updateProfile(cred.user, { displayName: 'Administrator' });
      } else {
        throw error;
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, nickname, signInWithGoogle, signInAsAdmin, signOut, updateNickname }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
