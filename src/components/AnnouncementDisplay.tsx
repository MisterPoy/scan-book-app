import { useState, useEffect, useCallback } from 'react';
import AnnouncementBanner from './AnnouncementBanner';
import AnnouncementModal from './AnnouncementModal';
import type { Announcement } from '../types/announcement';
import { getActiveAnnouncements } from '../services/announcements';
import { auth } from '../firebase';

interface AnnouncementDisplayProps {
  userEmail?: string | null;
  isAdmin?: boolean;
}

export default function AnnouncementDisplay({ userEmail, isAdmin }: AnnouncementDisplayProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [bannerAnnouncements, setBannerAnnouncements] = useState<Announcement[]>([]);
  const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const [shownModals, setShownModals] = useState<Set<string>>(new Set());

  const loadAnnouncements = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.debug('[Annonces] Authentification en cours, annonces chargées après login');
        return;
      }

      const activeAnnouncements = await getActiveAnnouncements();

      const filteredAnnouncements = activeAnnouncements.filter(announcement => {
        if (announcement.targetAudience === 'all') {
          return true;
        }
        if (announcement.targetAudience === 'admins') {
          return isAdmin;
        }
        if (announcement.targetAudience === 'specific' && announcement.targetUserIds) {
          return userEmail && announcement.targetUserIds.includes(userEmail);
        }
        return false;
      });

      setAnnouncements(filteredAnnouncements);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        console.debug('[Annonces] Permissions insuffisantes (utilisateur non authentifié)');
        return;
      }
      console.error('Erreur chargement annonces:', error);
    }
  }, [userEmail, isAdmin]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      loadAnnouncements();
    }
  }, [loadAnnouncements, userEmail]);

  const processAnnouncements = useCallback(() => {
    // Séparer les annonces par type d'affichage
    const banners: Announcement[] = [];
    let pendingModal: Announcement | null = null;

    // Trier les annonces par priorité (high > medium > low) puis par date
    const sortedAnnouncements = announcements.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    for (const announcement of sortedAnnouncements) {
      const shouldShowBanner = (announcement.displayMode === 'banner' || announcement.displayMode === 'both') &&
                              !dismissedBanners.has(announcement.id);

      const shouldShowModal = (announcement.displayMode === 'modal' || announcement.displayMode === 'both') &&
                             !shownModals.has(announcement.id) &&
                             !modalAnnouncement;

      if (shouldShowBanner) {
        banners.push(announcement);
      }

      if (shouldShowModal) {
        pendingModal = announcement;
      }
    }

    setBannerAnnouncements(banners);

    if (pendingModal && !modalAnnouncement) {
      setModalAnnouncement(pendingModal);
      setShownModals(prev => new Set(prev).add(pendingModal.id));
    }
  }, [announcements, dismissedBanners, shownModals, modalAnnouncement]);

  useEffect(() => {
    if (announcements.length > 0) {
      processAnnouncements();
    }
  }, [announcements, processAnnouncements]);

  const handleDismissBanner = (announcementId: string) => {
    setDismissedBanners(prev => new Set(prev).add(announcementId));
  };

  const handleCloseModal = () => {
    setModalAnnouncement(null);
    // Chercher la prochaine annonce modal à afficher
    setTimeout(() => {
      processAnnouncements();
    }, 100);
  };

  return (
    <>
      {/* Bandeaux */}
      {bannerAnnouncements.map(announcement => (
        <AnnouncementBanner
          key={announcement.id}
          announcement={announcement}
          onDismiss={handleDismissBanner}
        />
      ))}

      {/* Modal */}
      <AnnouncementModal
        announcement={modalAnnouncement}
        onClose={handleCloseModal}
      />
    </>
  );
}