/**
 * Collaboration constants, types, and helper utilities for Excalidraw room sync.
 */

export const COLLAB_COLORS = [
  { background: "#ffc9c9", stroke: "#e03131" },
  { background: "#ffec99", stroke: "#f08c00" },
  { background: "#b2f2bb", stroke: "#2f9e44" },
  { background: "#a5d8ff", stroke: "#1971c2" },
  { background: "#d0bfff", stroke: "#6741d9" },
  { background: "#fcc2d7", stroke: "#c2255c" },
  { background: "#c3fae8", stroke: "#0ca678" },
  { background: "#ffe066", stroke: "#e67700" },
];

export function getCollaboratorColor(socketId: string) {
  let hash = 0;
  for (let i = 0; i < socketId.length; i++) {
    hash = (hash << 5) - hash + socketId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLLAB_COLORS.length;
  return COLLAB_COLORS[index];
}

export enum WS_SUBTYPES {
  INIT = "SCENE_INIT",
  UPDATE = "SCENE_UPDATE",
  MOUSE_LOCATION = "MOUSE_LOCATION",
  IDLE_STATUS = "IDLE_STATUS",
  USER_VISIBLE_SCENE_BOUNDS = "USER_VISIBLE_SCENE_BOUNDS",
}

export type SocketUpdateData =
  | {
      type: WS_SUBTYPES.INIT;
      payload: {
        elements: readonly any[];
      };
    }
  | {
      type: WS_SUBTYPES.UPDATE;
      payload: {
        elements: readonly any[];
      };
    }
  | {
      type: WS_SUBTYPES.MOUSE_LOCATION;
      payload: {
        socketId: string;
        pointer: { x: number; y: number; tool: "pointer" | "laser" };
        button: "down" | "up";
        selectedElementIds: Record<string, boolean>;
        username: string;
      };
    }
  | {
      type: WS_SUBTYPES.IDLE_STATUS;
      payload: {
        socketId: string;
        userState: "active" | "idle" | "away";
        username: string;
      };
    };

export interface RoomHashData {
  roomId: string;
  roomKey: string;
}

export function parseRoomHash(hash: string): RoomHashData | null {
  // Format: #room=slug,key or room=slug,key
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const match = clean.match(/^room=([^,]+),(.+)$/);
  if (!match) return null;
  return {
    roomId: match[1],
    roomKey: match[2],
  };
}

export function buildRoomHash(roomId: string, roomKey: string): string {
  return `#room=${roomId},${roomKey}`;
}
