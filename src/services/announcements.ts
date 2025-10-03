import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Announcement, CreateAnnouncementData } from '../types/announcement';
import { triggerNotificationForAnnouncement } from './notificationSender';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

// Créer une nouvelle annonce
export const createAnnouncement = async (data: CreateAnnouncementData): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const announcementData = {
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      targetAudience: data.targetAudience || 'all'
    };

    const docRef = await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), announcementData);

    // Déclencher les notifications push pour les utilisateurs (seulement si le service est disponible)
    try {
      const createdAnnouncement: Announcement = {
        id: docRef.id,
        ...announcementData
      };

      // Envoyer les notifications en arrière-plan (ne pas bloquer la création)
      triggerNotificationForAnnouncement(createdAnnouncement).catch(error => {
        console.warn('❌ Erreur envoi notifications pour annonce:', docRef.id, error);
        // Ne pas faire échouer la création de l'annonce si les notifications échouent
      });
    } catch (notificationError) {
      console.warn('Service de notification non disponible:', notificationError);
      // Continuer normalement sans notifications
    }

    return docRef.id;
  } catch (error) {
    console.error('Erreur création annonce:', error);
    throw error;
  }
};

// Récupérer toutes les annonces actives
export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      where('isActive', '==', true),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const announcements: Announcement[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Vérifier si l'annonce n'est pas expirée
      if (!data.expiresAt || new Date(data.expiresAt) > new Date()) {
        announcements.push({
          id: doc.id,
          ...data
        } as Announcement);
      }
    });

    return announcements;
  } catch (error) {
    console.error('Erreur récupération annonces actives:', error);
    throw error;
  }
};

// Récupérer toutes les annonces (pour l'admin)
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const announcements: Announcement[] = [];

    querySnapshot.forEach((doc) => {
      announcements.push({
        id: doc.id,
        ...doc.data()
      } as Announcement);
    });

    return announcements;
  } catch (error) {
    console.error('Erreur récupération toutes annonces:', error);
    throw error;
  }
};

// Récupérer une annonce par ID
export const getAnnouncementById = async (id: string): Promise<Announcement | null> => {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Announcement;
    }

    return null;
  } catch (error) {
    console.error('Erreur récupération annonce:', error);
    throw error;
  }
};

// Mettre à jour une annonce
export const updateAnnouncement = async (id: string, data: Partial<CreateAnnouncementData>): Promise<void> => {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);

    // Filtrer les valeurs undefined pour éviter les erreurs Firestore
    const cleanData: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });

    const updateData = {
      ...cleanData,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Erreur mise à jour annonce:', error);
    throw error;
  }
};

// Supprimer une annonce
export const deleteAnnouncement = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erreur suppression annonce:', error);
    throw error;
  }
};

// Activer/Désactiver une annonce
export const toggleAnnouncementStatus = async (id: string, isActive: boolean): Promise<void> => {
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await updateDoc(docRef, {
      isActive,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur changement statut annonce:', error);
    throw error;
  }
};