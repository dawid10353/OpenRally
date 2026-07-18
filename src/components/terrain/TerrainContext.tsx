import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { HeightmapData } from '@/types/terrain';
import type { LevelData } from '@/types/level';
import { compileTerrain } from '@/utils/terrainCompiler';
import { DEFAULT_LEVEL_DATA } from '@/config/terrain';

/**
 * Shared terrain data — compiled once from LevelData and consumed by both
 * the visual Terrain mesh and the PropsInstancer.
 */
interface TerrainContextValue {
  /** The compiled heightmap data */
  heightmapData: HeightmapData;
  /** The explicit level data defining the map */
  levelData: LevelData;
}

const TerrainCtx = createContext<TerrainContextValue | null>(null);

interface TerrainProviderProps {
  levelData?: LevelData;
  children: ReactNode;
}

/**
 * TerrainProvider compiles the map data once and provides it to all
 * child components via React Context.
 */
export function TerrainProvider({
  levelData = DEFAULT_LEVEL_DATA,
  children,
}: TerrainProviderProps) {
  const value = useMemo<TerrainContextValue>(() => {
    // In Stage 4, this might be asynchronous if we load PNG heightmaps.
    // For now, we compile the Float32Array directly from the JSON instructions.
    const heightmapData = compileTerrain(levelData);
    return { heightmapData, levelData };
  }, [levelData]);

  return <TerrainCtx.Provider value={value}>{children}</TerrainCtx.Provider>;
}

/**
 * Hook to consume the shared heightmap data from TerrainProvider.
 * Must be used within a <TerrainProvider>.
 */
export function useTerrainData(): TerrainContextValue {
  const ctx = useContext(TerrainCtx);
  if (!ctx) {
    throw new Error('useTerrainData must be used within a <TerrainProvider>');
  }
  return ctx;
}
