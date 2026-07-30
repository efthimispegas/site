import { HERO_WORLD_LAYOUT } from '../hero-world-layout';
import { ProceduralWorldItem } from './primitives';

export function ClearanceStage() {
  return (
    <group>
      {HERO_WORLD_LAYOUT.clearance.items.map((item) => (
        <ProceduralWorldItem key={item.id} item={item} />
      ))}
    </group>
  );
}
