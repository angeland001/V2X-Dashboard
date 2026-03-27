import useSWR from 'swr';
import {
  fetchUserProfile,
  updateUserProfile,
  uploadProfilePicture,
} from '../../../services/settingsapi/settingsApi';

export function useUserProfile() {
  const stored = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = stored.id;

  const { data, error, isLoading, mutate } = useSWR(
    userId ? `user-profile-${userId}` : null,
    () => fetchUserProfile(userId),
  );

  const saveProfile = async (fields) => {
    const updated = await updateUserProfile(userId, fields);
    mutate(updated, { revalidate: false });
    return updated;
  };

  const savePicture = async (file) => {
    const result = await uploadProfilePicture(userId, file);
    mutate(result.user, { revalidate: false });
    return result;
  };

  const removePicture = async () => {
    const updated = await updateUserProfile(userId, { profile_picture: null });
    mutate(updated, { revalidate: false });
    return updated;
  };

  return { profile: data, isLoading, error, saveProfile, savePicture, removePicture, mutate };
}
