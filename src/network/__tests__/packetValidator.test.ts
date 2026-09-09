import { describe, it, expect } from 'vitest';
import {
  sanitizeNickname,
  isValidVehicleId,
  isValidQuaternion,
  validateTelemetryPayload,
  parseClientMessage,
  parseServerMessage,
} from '../packetValidator';

describe('packetValidator', () => {
  describe('sanitizeNickname', () => {
    it('accepts valid alphanumeric nicknames', () => {
      expect(sanitizeNickname('ApexDriver')).toBe('ApexDriver');
      expect(sanitizeNickname('Rally_King-01')).toBe('Rally_King-01');
      expect(sanitizeNickname('Drift Pro')).toBe('Drift Pro');
    });

    it('trims whitespace', () => {
      expect(sanitizeNickname('  Speedster  ')).toBe('Speedster');
    });

    it('rejects too short or too long nicknames', () => {
      expect(sanitizeNickname('A')).toBeNull();
      expect(sanitizeNickname('')).toBeNull();
      expect(sanitizeNickname('a'.repeat(17))).toBeNull();
    });

    it('rejects forbidden characters / code injection', () => {
      expect(sanitizeNickname('<script>alert(1)</script>')).toBeNull();
      expect(sanitizeNickname('Rally; DROP TABLE')).toBeNull();
      expect(sanitizeNickname('User@Domain!')).toBeNull();
    });
  });

  describe('isValidVehicleId', () => {
    it('approves existing vehicles in registry', () => {
      expect(isValidVehicleId('rally_hatchback')).toBe(true);
      expect(isValidVehicleId('rally_wrc')).toBe(true);
    });

    it('rejects non-existent or malicious IDs', () => {
      expect(isValidVehicleId('ferrari_f40')).toBe(false);
      expect(isValidVehicleId('../etc/passwd')).toBe(false);
      expect(isValidVehicleId(null)).toBe(false);
    });
  });

  describe('isValidQuaternion', () => {
    it('validates normalized quaternions', () => {
      expect(isValidQuaternion([0, 0, 0, 1])).toBe(true);
      expect(isValidQuaternion([0, 0.7071, 0, 0.7071])).toBe(true);
    });

    it('rejects denormalized, NaN or corrupt quaternions', () => {
      expect(isValidQuaternion([0, 0, 0, 0])).toBe(false);
      expect(isValidQuaternion([NaN, 0, 0, 1])).toBe(false);
      expect(isValidQuaternion([1, 1, 1, 1])).toBe(false);
      expect(isValidQuaternion([0, 0, 1])).toBe(false);
    });
  });

  describe('validateTelemetryPayload', () => {
    it('accepts standard in-bounds telemetry', () => {
      const payload = {
        seq: 10,
        time: 123456789,
        pos: [10, 2, -15],
        rot: [0, 0, 0, 1],
        linVel: [15, 0, 20],
        angVel: [0, 0.5, 0],
        steer: 0.25,
        wheelRots: [10, 10, 10, 10],
        rpm: 4500,
        gear: 3,
        isDrifting: false,
        surface: 'tarmac',
      };
      const result = validateTelemetryPayload(payload);
      expect(result).not.toBeNull();
      expect(result?.pos).toEqual([10, 2, -15]);
      expect(result?.surface).toBe('tarmac');
    });

    it('rejects out-of-bounds positions or NaN values', () => {
      const corruptPayload = {
        seq: 10,
        time: 123456789,
        pos: [999999, 0, 0], // out of bounds
        rot: [0, 0, 0, 1],
        linVel: [0, 0, 0],
        angVel: [0, 0, 0],
        steer: 0,
        wheelRots: [0, 0, 0, 0],
        rpm: 1000,
        gear: 1,
        isDrifting: false,
      };
      expect(validateTelemetryPayload(corruptPayload)).toBeNull();
    });
  });

  describe('parseClientMessage & parseServerMessage', () => {
    it('parses valid join_lobby message', () => {
      const msg = parseClientMessage({
        type: 'join_lobby',
        nickname: 'Vortex_Racer',
        vehicleId: 'rally_wrc',
        levelId: 'level5_gymkhana',
      });
      expect(msg).toEqual({
        type: 'join_lobby',
        nickname: 'Vortex_Racer',
        vehicleId: 'rally_wrc',
        levelId: 'level5_gymkhana',
      });
    });

    it('parses valid create_room message with levelId and gameMode', () => {
      const msg = parseClientMessage({
        type: 'create_room',
        name: 'Highland Rally',
        nickname: 'LochMaster',
        vehicleId: 'zephyr_wr4',
        levelId: 'level4_britain',
        gameMode: 'timeattack',
      });
      expect(msg).toEqual({
        type: 'create_room',
        name: 'Highland Rally',
        nickname: 'LochMaster',
        vehicleId: 'zephyr_wr4',
        levelId: 'level4_britain',
        gameMode: 'timeattack',
      });
    });

    it('parses valid pong and player_left server messages', () => {
      const pong = parseServerMessage({
        type: 'pong',
        clientTime: 1000,
        serverTime: 1020,
      });
      expect(pong).toEqual({
        type: 'pong',
        clientTime: 1000,
        serverTime: 1020,
      });

      const left = parseServerMessage({
        type: 'player_left',
        playerId: 'p123',
        reason: 'timeout',
      });
      expect(left).toEqual({
        type: 'player_left',
        playerId: 'p123',
        reason: 'timeout',
      });
    });
  });
});
