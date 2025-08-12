"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectLoadout = exports.startGame = exports.joinPrivateRoom = exports.createPrivateRoom = exports.purchaseStatus = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const statusTiers = {
    "Greyhat 💻": { cost: 1 },
    "Dev 🔏": { cost: 10 },
    "Blackhat 🎩": { cost: 50 },
    "+1 Prestige": { cost: 100, prestige: 1 },
};
exports.purchaseStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to make a purchase.");
    }
    const { uid } = context.auth;
    const { itemName } = data;
    const item = statusTiers[itemName];
    if (!item) {
        throw new functions.https.HttpsError("not-found", `The item "${itemName}" does not exist.`);
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
                throw new functions.https.HttpsError("permission-denied", "Guests cannot make purchases.");
            }
            if (userData.btc_balance < item.cost) {
                throw new functions.https.HttpsError("failed-precondition", "Insufficient $BTC balance.");
            }
            const newBalance = userData.btc_balance - item.cost;
            const updates = {
                btc_balance: newBalance,
            };
            if (item.prestige) {
                updates.prestige = admin.firestore.FieldValue.increment(item.prestige);
            }
            else {
                updates.status = itemName;
            }
            transaction.update(userRef, updates);
            return { success: true, message: `Successfully purchased ${itemName}!` };
        });
    }
    catch (error) {
        console.error("Transaction failed:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred during the transaction.");
    }
});
// --- Game Lobby Functions ---
const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.createPrivateRoom = functions.https.onCall(async (_, context) => {
    var _a, _b, _c;
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
        username: (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.username,
        status: (_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.status,
        prestige: (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.prestige,
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
exports.joinPrivateRoom = functions.https.onCall(async ({ roomCode }, context) => {
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
        if (!roomDoc.exists)
            throw new functions.https.HttpsError("not-found", "Room not found.");
        if (!userDoc.exists)
            throw new functions.https.HttpsError("not-found", "User profile not found.");
        const roomData = roomDoc.data();
        if (roomData.players.length >= roomData.maxPlayers)
            throw new functions.https.HttpsError("failed-precondition", "Room is full.");
        if (roomData.players.some((p) => p.uid === uid))
            return { roomCode: upperRoomCode };
        const newPlayer = {
            uid,
            username: userDoc.data().username,
            status: userDoc.data().status,
            prestige: userDoc.data().prestige,
        };
        transaction.update(roomRef, {
            players: admin.firestore.FieldValue.arrayUnion(newPlayer),
        });
        return { roomCode: upperRoomCode };
    });
});
// --- Gameplay Cloud Functions ---
exports.startGame = functions.https.onCall(async ({ roomCode }, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    }
    const { uid } = context.auth;
    const roomRef = db.collection("game_rooms").doc(roomCode.toUpperCase());
    const roomDoc = await roomRef.get();
    if (!roomDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Room not found.");
    }
    const roomData = roomDoc.data();
    if (roomData.hostId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the host can start the game.");
    }
    if (roomData.players.length !== roomData.maxPlayers) {
        throw new functions.https.HttpsError("failed-precondition", "The room is not full yet.");
    }
    if (roomData.state !== "waiting") {
        throw new functions.https.HttpsError("failed-precondition", "The game has already started.");
    }
    const gameData = {};
    roomData.players.forEach((player) => {
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
exports.selectLoadout = functions.https.onCall(async (data, context) => {
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
        if (!roomDoc.exists)
            throw new functions.https.HttpsError("not-found", "Room not found.");
        const roomData = roomDoc.data();
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
        const updates = {};
        updates[`gameData.${uid}.loadout`] = playerLoadout;
        transaction.update(roomRef, updates);
        const allPlayersReady = roomData.players.every((player) => {
            var _a;
            if (player.uid === uid)
                return true;
            return !!((_a = roomData.gameData[player.uid]) === null || _a === void 0 ? void 0 : _a.loadout);
        });
        if (allPlayersReady) {
            transaction.update(roomRef, { state: "in_progress" });
        }
        return { success: true, message: "Loadout confirmed. Waiting for opponent." };
    });
});
//# sourceMappingURL=index.js.map