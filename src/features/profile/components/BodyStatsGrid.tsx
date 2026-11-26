import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { StatBlock } from '@/components/ui/StatBlock';
import { bodyMassIndex } from '@/domain/profile/profile-rules';
import type { Profile } from '@/domain/types/profile';
import { formatDecimal } from '@/lib/format';

/** Weight, height and BMI in a three-column grid. */
export function BodyStatsGrid({ profile }: { profile: Pick<Profile, 'weightKg' | 'heightCm'> }) {
  const bmi = bodyMassIndex(profile.weightKg, profile.heightCm);
  const weight =
    profile.weightKg === null
      ? '--'
      : formatDecimal(profile.weightKg, Number.isInteger(profile.weightKg) ? 0 : 1);

  return (
    <View className="flex-row gap-3">
      <Card className="flex-1 px-3">
        <StatBlock size="medium" align="left" label="Peso" value={weight} unit="kg" />
      </Card>
      <Card className="flex-1 px-3">
        <StatBlock
          size="medium"
          align="left"
          label="Altura"
          value={profile.heightCm === null ? '--' : String(profile.heightCm)}
          unit="cm"
        />
      </Card>
      <Card className="flex-1 px-3">
        <StatBlock size="medium" align="left" label="IMC" value={formatDecimal(bmi)} />
      </Card>
    </View>
  );
}
