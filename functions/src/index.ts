import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// --- User Profile & Economy Functions ---

interface PurchaseData {
  itemName: string;
}

const statusTiers: Record<string, { cost: number; prestige?: number }> = {
  "Greyhat 💻": { cost: 1 },
  "Dev 🔏": { cost: 10 },
  "Blackhat 🎩": { cost: 50 },
  "+1 Prestige": { cost: 100, prestige: 1 },
};

export const purchaseStatus = functions.https.onCall(async (data: PurchaseData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to make a purchase.",
    );
  }

  const { uid } = context.auth;
  const { itemName } = data;
  const item = statusTiers[itemName];

  if (!item) {
    throw new functions.https.HttpsError(
      "not-found",
      `The item "${itemName}" does not exist.`,
    );
  }

  const userRef = db.collection("users").doc(uid);

  try {
    return await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User data not found.");
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new functions.https.HttpsError("internal", "Failed to read user data.");
      }
      
      if (userData.isGuest) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Guests cannot make purchases.",
        );
      }

      if (userData.btc_balance < item.cost) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Insufficient $BTC balance.",
        );
      }

      const newBalance = userData.btc_balance - item.cost;
      const updates: { btc_balance: number; status?: string; prestige?: admin.firestore.FieldValue } = {
        btc_balance: newBalance,
      };

      if (item.prestige) {
        updates.prestige = admin.firestore.FieldValue.increment(item.prestige);
      } else {
        updates.status = itemName;
      }

      transaction.update(userRef, updates);

      return { success: true, message: `Successfully purchased ${itemName}!` };
    });
  } catch (error) {
    console.error("Transaction failed:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "An unexpected error occurred during the transaction.");
  }
});

// --- Game Lobby Functions ---

const generateRoomCode = (): string => {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createPrivateRoom = functions.https.onCall(async (_, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const { uid } = context.auth;
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "User profile not found.");
  }
  const roomCode = generateRoomCode();
  const player_data = {
    uid,
    username: userDoc.data()?.username,
    status: userDoc.data()?.status,
    prestige: userDoc.data()?.prestige,
  };
  await db.collection("game_rooms").doc(roomCode).set({
    code: roomCode,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    hostId: uid,
    players: [player_data],
    state: "waiting",
    gameMode: "pvp_private",
    maxPlayers: 2,
  });
  return { roomCode };
});

export const joinPrivateRoom = functions.https.onCall(async ({ roomCode }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const { uid } = context.auth;
  const upperRoomCode = roomCode.toUpperCase();
  const roomRef = db.collection("game_rooms").doc(upperRoomCode);
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    const userDoc = await transaction.get(userRef);
    if (!roomDoc.exists) throw new functions.https.HttpsError("not-found", "Room not found.");
    if (!userDoc.exists) throw new functions.https.HttpsError("not-found", "User profile not found.");
    const roomData = roomDoc.data()!;
    if (roomData.players.length >= roomData.maxPlayers) throw new functions.https.HttpsError("failed-precondition", "Room is full.");
    if (roomData.players.some((p: any) => p.uid === uid)) return { roomCode: upperRoomCode };
    const newPlayer = {
      uid,
      username: userDoc.data()!.username,
      status: userDoc.data()!.status,
      prestige: userDoc.data()!.prestige,
    };
    transaction.update(roomRef, {
      players: admin.firestore.FieldValue.arrayUnion(newPlayer),
    });
    return { roomCode: upperRoomCode };
  });
});

// --- Gameplay Cloud Functions ---

export const startGame = functions.https.onCall(async ({ roomCode }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const { uid } = context.auth;
  const roomRef = db.collection("game_rooms").doc(roomCode.toUpperCase());
  const roomDoc = await roomRef.get();

  if (!roomDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Room not found.");
  }
  const roomData = roomDoc.data()!;
  if (roomData.hostId !== uid) {
    throw new functions.https.HttpsError("permission-denied", "Only the host can start the game.");
  }
  if (roomData.players.length !== roomData.maxPlayers) {
    throw new functions.https.HttpsError("failed-precondition", "The room is not full yet.");
  }
  if (roomData.state !== "waiting") {
    throw new functions.https.HttpsError("failed-precondition", "The game has already started.");
  }

  const gameData: { [key: string]: any } = {};
  roomData.players.forEach((player: any) => {
    gameData[player.uid] = {
      systemIntegrity: 100,
      loadout: null,
      cooldowns: {},
    };
  });

  await roomRef.update({
    state: "loadout",
    gameData: gameData,
  });

  return { success: true, message: "Game starting. Proceed to loadout selection." };
});

export const selectLoadout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const { uid } = context.auth;
  const { roomCode, attackTools, defenseTools } = data;

  if (!Array.isArray(attackTools) || attackTools.length !== 2 || !Array.isArray(defenseTools) || defenseTools.length !== 2) {
    throw new functions.https.HttpsError("invalid-argument", "You must select 2 attack and 2 defense tools.");
  }

  const roomRef = db.collection("game_rooms").doc(roomCode.toUpperCase());

  return db.runTransaction(async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists) throw new functions.https.HttpsError("not-found", "Room not found.");

    const roomData = roomDoc.data()!;
    if (roomData.state !== "loadout") {
      throw new functions.https.HttpsError("failed-precondition", "Not in the loadout selection phase.");
    }
    if (!roomData.gameData || !roomData.gameData[uid]) {
      throw new functions.https.HttpsError("internal", "Player game data not found.");
    }
    if (roomData.gameData[uid].loadout) {
      return { success: true, message: "Loadout already submitted." };
    }

    const playerLoadout = { attack: attackTools, defense: defenseTools };
    const updates: { [key: string]: any } = {};
    updates[`gameData.${uid}.loadout`] = playerLoadout;
    transaction.update(roomRef, updates);

    const allPlayersReady = roomData.players.every((player: any) => {
      if (player.uid === uid) return true;
      return !!roomData.gameData[player.uid]?.loadout;
    });

    if (allPlayersReady) {
      transaction.update(roomRef, { state: "in_progress" });
    }

    return { success: true, message: "Loadout confirmed. Waiting for opponent." };
  });
});
