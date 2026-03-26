import useSWR from 'swr';
import { fetchUserProfile } from '../../../services/settingsapi/settingsApi';

export function useUserProfile() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;

    const {data, error, isLoading, mutate } = useSWR(
        userId ? `user-${userId}` : null, // if null, skip fetch
        () => fetchUserProfile(userId)
    );

    return {profile: data, isLoading, error, mutate};
    
}