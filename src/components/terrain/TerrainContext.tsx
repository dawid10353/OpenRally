import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { HeightmapData, TerrainConfig } from '@/types/terrain';
import { generateHeightmap } from '@/utils/terrainGenerator';
import { DEFAULT_TERRAIN_CONFIG } from '@/config/terrain';

/**
 * Shared terrain data — generated once and consumed by both
 * the visual Terrain mesh and the PropsInstancer.
 */
interface TerrainContextValue {
  /** The generated heightmap data */
  heightmapData: HeightmapData;
  /** The terrain configuration used to generate the heightmap */
  config: TerrainConfig;
}

const TerrainCtx = createContext<TerrainContextValue | null>(null);

interface TerrainProviderProps {
  config?: TerrainConfig;
  children: ReactNode;
}

/**
 * TerrainProvider generates the heightmap once and provides it to all
 * child components via React Context. This avoids duplicate heightmap
 * generation in Terrain and PropsInstancer.
 */
export function TerrainProvider({
  config = DEFAULT_TERRAIN_CONFIG,
  children,
}: TerrainProviderProps) {
  const value = useMemo<TerrainContextValue>(() => {
    const heightmapData = generateHeightmap(config);
    return { heightmapData, config };
  }, [config]);

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
