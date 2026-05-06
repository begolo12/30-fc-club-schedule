import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsAdmin: (id: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          // Simple admin check based on email
          setIsAdmin(currentUser.email === 'admin@30fc.club');
          
          // Ensure user document exists
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                displayName: currentUser.displayName || 'Unknown',
                email: currentUser.email || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            }
          } catch (error: any) {
            if (error.message?.includes('offline')) {
              console.error("Firestore database might not exist or is unreachable. Please ensure Firestore is enabled in the Firebase console and not blocked by network policies.");
            } else {
              try {
                handleFirestoreError(error, OperationType.GET, 'users');
              } catch (err) {
                console.error(err);
              }
            }
          }
        } else {
          setIsAdmin(false);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInAsAdmin = async (id: string, pin: string) => {
    if (id !== 'admin' || pin !== 'admin123') {
      throw new Error('Invalid Admin Credentials');
    }
    
    // We implicitly translate 'admin' id into an email for Firebase Auth
    const adminEmail = 'admin@30fc.club';
    
    try {
      await signInWithEmailAndPassword(auth, adminEmail, pin);
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Please enable Email/Password authentication in your Firebase Console.');
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        try {
          // Attempt to bootstrap the admin account automatically
          const cred = await createUserWithEmailAndPassword(auth, adminEmail, pin);
          await updateProfile(cred.user, { displayName: 'Administrator' });
        } catch (err: any) {
          if (err.code === 'auth/operation-not-allowed') {
            throw new Error('Please enable Email/Password authentication in your Firebase Console.');
          }
          if (err.code === 'auth/email-already-in-use') {
             // It means wrong password was entered during log in, but for our hardcoded check, this shouldn't happen because we checked pin !== 'admin123'
             throw new Error('Invalid Admin Credentials');
          }
          throw err;
        }
      } else {
        throw error;
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, signInAsAdmin, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
