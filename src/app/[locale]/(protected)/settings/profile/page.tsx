import { ProfileDetailsCard } from '@/components/settings/profile/profile-details-card';
import { UpdateNameCard } from '@/components/settings/profile/update-name-card';

export default function ProfilePage() {
  return (
    <div className="w-full max-w-3xl space-y-8">
      <UpdateNameCard />
      <ProfileDetailsCard />
    </div>
  );
}
