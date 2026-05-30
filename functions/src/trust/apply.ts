import type { CharacterPublic, GameId, GameMeta, UserId } from '@village/shared';

import { runTransaction, userDb } from '../db/admin.js';
import { clampTrust, type TrustDeltaResult } from './calculate.js';

/**
 * {@link TrustDeltaResult} を Firestore に atomic 適用する。
 *
 * - meta.villageTrust と各 character.trustToPlayer を 0-100 でクランプして書き戻す
 * - すべての read を write より先に行う（Firestore transaction の制約）
 * - 存在しない character は黙って skip（夜間に死亡したキャラなどを想定）
 */
export async function applyTrustDelta(
  uid: UserId,
  gameId: GameId,
  delta: TrustDeltaResult
): Promise<void> {
  const characterDeltaEntries = Object.entries(delta.characterDeltas);

  // delta が空なら no-op (テストで誤って transaction を回さないように早期 return)
  if (delta.villageDelta === 0 && characterDeltaEntries.length === 0) return;

  await runTransaction(async (tx) => {
    const metaRef = userDb.meta.ref(uid, gameId);
    const characterTargets = characterDeltaEntries.map(([charId, charDelta]) => ({
      charId,
      charDelta,
      ref: userDb.characters.ref(uid, gameId, charId),
    }));

    // ---- reads ----
    const metaSnap = await tx.get(metaRef);
    if (!metaSnap.exists) {
      throw new Error(`applyTrustDelta: meta not found for game ${gameId}`);
    }
    const meta = metaSnap.data() as GameMeta;

    const characterSnaps = await Promise.all(characterTargets.map((t) => tx.get(t.ref)));

    // ---- writes ----
    const newVillageTrust = clampTrust(meta.villageTrust + delta.villageDelta);
    tx.update(metaRef, { villageTrust: newVillageTrust });

    for (let i = 0; i < characterTargets.length; i++) {
      const target = characterTargets[i]!;
      const snap = characterSnaps[i]!;
      if (!snap.exists) continue; // 死亡などで消えていれば skip
      const character = snap.data() as CharacterPublic;
      const newTrust = clampTrust(character.trustToPlayer + target.charDelta);
      tx.update(target.ref, { trustToPlayer: newTrust });
    }
  });
}
