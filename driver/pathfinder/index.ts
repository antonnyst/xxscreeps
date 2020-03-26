import { Goal, SearchOptions } from '~/game/path-finder';
import { World } from '~/game/map';
import { generateRoomName, parseRoomName, PositionInteger, RoomPosition } from '~/game/position';
import { getBuffer } from '~/game/terrain';
import { clamp } from '~/lib/utility';
import pf from './pf';
import * as Path from 'path';

function flattenPosition(pos: any): number {
	// Internal position bits
	const positionInteger = pos[PositionInteger];
	if (positionInteger !== undefined) {
		return positionInteger | 0;
	}

	// Try to cast to RoomPosition
	return flattenPosition(new RoomPosition(pos.x, pos.y, pos.roomName));
}

type SearchReturn = {
	path: RoomPosition[];
	ops: number;
	cost: number;
	incomplete: boolean;
};

export function search(origin: RoomPosition, goal: Goal | Goal[], userOptions: SearchOptions = {}): SearchReturn {

	// Inject defaults
	const options = {
		plainCost: 1,
		swampCost: 5,
		heuristicWeight: 1,
		maxOps: 2000,
		maxCost: 0xffffffff,
		maxRooms: 64,
		...userOptions,
	};

	const plainCost = clamp(1, 254, options.plainCost | 0);
	const swampCost = clamp(1, 254, options.swampCost | 0);
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	const heuristicWeight = clamp(1, 9, options.heuristicWeight || 0);
	const maxOps = clamp(1, 2000, options.maxOps | 0);
	const maxCost = clamp(1, 0xffffffff, options.maxCost >>> 0);
	const maxRooms = clamp(1, 64, options.maxRooms | 0);
	const flee = !!options.flee;

	// Convert one-or-many goal into standard format for native extension
	const goals = (Array.isArray(goal) ? goal : [ goal ]).map(goal => {
		if ('range' in goal) {
			return {
				pos: flattenPosition(goal.pos),
				range: goal.range | 0,
			};
		} else {
			return {
				pos: flattenPosition(goal),
				range: 0,
			};
		}
	});

	// Setup room callback
	const { roomCallback } = options;
	const callback = roomCallback === undefined ? undefined : (roomId: number) => {
		const ret = roomCallback(generateRoomName(roomId));
		if (ret === false) {
			return ret;
		} else {
			return ret._bits;
		}
	};

	// Invoke native code
	const ret = pf.search(
		flattenPosition(origin), goals,
		callback,
		plainCost, swampCost,
		maxRooms, maxOps, maxCost,
		flee,
		heuristicWeight,
	);

	// Translate results
	if (ret === undefined) {
		return { path: [], ops: 0, cost: 0, incomplete: false };
	} else if (ret === -1) {
		return { path: [], ops: 0, cost: 0, incomplete: true };
	}
	ret.path = ret.path.map((pos: number) => new RoomPosition(pos)).reverse();
	return ret;
}

export function loadTerrain(world: World) {
	const rooms: Record<string, Readonly<Uint8Array>> = {};
	for (const [ name, terrain ] of world.entries()) {
		const [ rx, ry ] = parseRoomName(name);
		const id = ry << 8 | rx;
		rooms[id] = getBuffer(terrain);
	}
	pf.loadTerrain(rooms);
}

export function locateModule() {
	return Path.join(__dirname, pf.relativePath);
}
