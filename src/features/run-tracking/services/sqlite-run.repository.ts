import * as SQLite from 'expo-sqlite';

import type { RunSession } from '@/domain/run-session/run-session';
import type { GpsSample, RunSummary } from '@/domain/types/run';

import type { RunRepository, StoredRun } from '../types';

const DATABASE_NAME = 'thunder-runs.db';

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS local_runs (
     id TEXT PRIMARY KEY NOT NULL,
     user_id TEXT NOT NULL,
     status TEXT NOT NULL,
     session_json TEXT NOT NULL,
     summary_json TEXT,
     title TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS local_points (
     run_id TEXT NOT NULL,
     seq INTEGER NOT NULL,
     timestamp INTEGER NOT NULL,
     latitude REAL NOT NULL,
     longitude REAL NOT NULL,
     altitude REAL,
     accuracy REAL,
     speed REAL,
     segment INTEGER NOT NULL,
     PRIMARY KEY (run_id, seq)
   );`,
];

type RunRow = {
  id: string;
  user_id: string;
  status: string;
  session_json: string;
  summary_json: string | null;
  title: string | null;
  created_at: number;
};

type PointRow = {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  segment: number;
};

function rowToRun(row: RunRow): StoredRun {
  return {
    session: JSON.parse(row.session_json) as RunSession,
    userId: row.user_id,
    summary: row.summary_json ? (JSON.parse(row.summary_json) as RunSummary) : null,
    title: row.title,
    createdAt: row.created_at,
  };
}

function rowToSample(row: PointRow): GpsSample {
  return {
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    altitudeM: row.altitude,
    accuracyM: row.accuracy,
    speedMps: row.speed,
    segment: row.segment,
  };
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const { user_version: version } = (await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  )) ?? { user_version: 0 };

  for (let i = version; i < MIGRATIONS.length; i += 1) {
    await db.execAsync(MIGRATIONS[i] as string);
    await db.execAsync(`PRAGMA user_version = ${i + 1}`);
  }
  return db;
}

/**
 * SQLite-backed RunRepository. Points are written as they arrive so a run
 * survives the app being killed mid-run (the background task can restart it).
 */
export function createSqliteRunRepository(): RunRepository {
  let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
  const db = () => (dbPromise ??= openDatabase());

  return {
    async getActiveRun() {
      const row = await (
        await db()
      ).getFirstAsync<RunRow>(
        "SELECT * FROM local_runs WHERE status != 'finished' ORDER BY created_at DESC LIMIT 1",
      );
      return row ? rowToRun(row) : null;
    },

    async listPendingRuns(userId) {
      const rows = await (
        await db()
      ).getAllAsync<RunRow>(
        "SELECT * FROM local_runs WHERE status = 'finished' AND user_id = ? ORDER BY created_at",
        userId,
      );
      return rows.map(rowToRun);
    },

    async getRun(runId) {
      const row = await (
        await db()
      ).getFirstAsync<RunRow>('SELECT * FROM local_runs WHERE id = ?', runId);
      return row ? rowToRun(row) : null;
    },

    async saveRun(run) {
      await (
        await db()
      ).runAsync(
        `INSERT INTO local_runs (id, user_id, status, session_json, summary_json, title, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           session_json = excluded.session_json,
           summary_json = excluded.summary_json,
           title = excluded.title`,
        run.session.id,
        run.userId,
        run.session.status,
        JSON.stringify(run.session),
        run.summary ? JSON.stringify(run.summary) : null,
        run.title,
        run.createdAt,
      );
    },

    async appendSamples(runId, samples) {
      if (samples.length === 0) return;
      const database = await db();
      await database.withExclusiveTransactionAsync(async (txn) => {
        const last = await txn.getFirstAsync<{ next: number }>(
          'SELECT COALESCE(MAX(seq) + 1, 0) AS next FROM local_points WHERE run_id = ?',
          runId,
        );
        let seq = last?.next ?? 0;
        for (const s of samples) {
          await txn.runAsync(
            `INSERT INTO local_points
               (run_id, seq, timestamp, latitude, longitude, altitude, accuracy, speed, segment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            runId,
            seq,
            s.timestamp,
            s.latitude,
            s.longitude,
            s.altitudeM,
            s.accuracyM,
            s.speedMps,
            s.segment,
          );
          seq += 1;
        }
      });
    },

    async getSamples(runId) {
      const rows = await (
        await db()
      ).getAllAsync<PointRow>('SELECT * FROM local_points WHERE run_id = ? ORDER BY seq', runId);
      return rows.map(rowToSample);
    },

    async getLastSample(runId) {
      const row = await (
        await db()
      ).getFirstAsync<PointRow>(
        'SELECT * FROM local_points WHERE run_id = ? ORDER BY seq DESC LIMIT 1',
        runId,
      );
      return row ? rowToSample(row) : null;
    },

    async deleteRun(runId) {
      const database = await db();
      await database.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync('DELETE FROM local_points WHERE run_id = ?', runId);
        await txn.runAsync('DELETE FROM local_runs WHERE id = ?', runId);
      });
    },
  };
}
