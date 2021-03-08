import * as C from 'xxscreeps/game/constants';
import * as Game from 'xxscreeps/game/game';
import * as RoomObject from 'xxscreeps/game/objects/room-object';
import * as Structure from '.';
import { RoomPosition } from 'xxscreeps/game/position';
import { compose, declare, member, struct, variant, withOverlay } from 'xxscreeps/schema';
import { assign } from 'xxscreeps/util/utility';

export const NextDecayTime = Symbol('nextDecayTime');

export function format() { return compose(shape, StructureRoad) }
const shape = declare('Road', struct(Structure.format, {
	...variant('road'),
	nextDecayTime: member(NextDecayTime, 'int32'),
}));

export class StructureRoad extends withOverlay(Structure.Structure, shape) {
	get structureType() { return C.STRUCTURE_ROAD }
	get ticksToDecay() { return Math.max(0, this[NextDecayTime] - Game.time) }
}

export function create(pos: RoomPosition) {
	return assign(RoomObject.create(new StructureRoad, pos), {
		hits: C.ROAD_HITS,
		[NextDecayTime]: Game.time + C.ROAD_DECAY_TIME,
	});
}
