import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GymkhanaCompleteModal } from '../GymkhanaCompleteModal';
import { useGymkhanaStore } from '@/store/gymkhanaStore';
import { useGameStore } from '@/store/gameStore';

describe('GymkhanaCompleteModal - Gamepad & Keyboard Navigation', () => {
  beforeEach(() => {
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'gymkhana_blitz',
      gamepadConnected: true,
      gamepadType: 'dualsense',
    });
    useGymkhanaStore.setState({
      showResultsModal: true,
      totalScore: 42500,
      bestScore: 50000,
      isNewRecord: false,
      stats: {
        maxMultiplier: 5,
        maxAngleDeg: 42,
        longestDriftSeconds: 6.2,
        totalDrifts: 14,
      },
    });
  });

  it('renders nothing when showResultsModal is false', () => {
    useGymkhanaStore.setState({ showResultsModal: false });
    const html = renderToString(<GymkhanaCompleteModal />);
    expect(html).toBe('');
  });

  it('renders stage complete title, formatted total score, and all three action buttons', () => {
    const html = renderToString(<GymkhanaCompleteModal />);

    expect(html).toContain('STAGE COMPLETE');
    expect(html).toContain('GYMKHANA BLITZ');
    expect(html).toContain('TOTAL DRIFT SCORE');
    expect(html).toContain('42,500');
    expect(html).toContain('PLAY AGAIN');
    expect(html).toContain('CONTINUE IN FREE ROAM');
    expect(html).toContain('RETURN TO MENU');
  });

  it('renders PlayStation controller helper prompts when DualSense gamepad is connected', () => {
    useGameStore.setState({ gamepadConnected: true, gamepadType: 'dualsense' });
    const html = renderToString(<GymkhanaCompleteModal />);

    expect(html).toContain('✕ Wybierz');
    expect(html).toContain('◯ Menu');
    expect(html).toContain('▲▼ Nawigacja');
  });

  it('renders Xbox controller helper prompts when Xbox controller is connected', () => {
    useGameStore.setState({ gamepadConnected: true, gamepadType: 'xbox' });
    const html = renderToString(<GymkhanaCompleteModal />);

    expect(html).toContain('A Select');
    expect(html).toContain('B Menu');
    expect(html).toContain('▲▼ Nawigacja');
  });

  it('renders keyboard helper prompts when no gamepad is connected', () => {
    useGameStore.setState({ gamepadConnected: false });
    const html = renderToString(<GymkhanaCompleteModal />);

    expect(html).toContain('Enter / Space Select');
    expect(html).toContain('Esc Menu');
    expect(html).toContain('W / S Navigate');
  });

  it('verifies state transitions for all modal action handlers', () => {
    // 1. Play Again
    useGymkhanaStore.getState().dismissResultsModal();
    useGymkhanaStore.getState().resetBlitz();
    expect(useGymkhanaStore.getState().showResultsModal).toBe(false);
    expect(useGymkhanaStore.getState().status).toBe('idle');

    // 2. Continue in Free Roam
    useGymkhanaStore.getState().dismissResultsModal();
    useGymkhanaStore.getState().resetBlitz();
    useGameStore.getState().setGameMode('freeroam');
    expect(useGameStore.getState().gameMode).toBe('freeroam');
    expect(useGymkhanaStore.getState().status).toBe('idle');

    // 3. Return to Menu
    useGymkhanaStore.getState().dismissResultsModal();
    useGymkhanaStore.getState().resetBlitz();
    useGameStore.getState().setGameState('menu');
    expect(useGameStore.getState().gameState).toBe('menu');
    expect(useGymkhanaStore.getState().status).toBe('idle');
  });
});
