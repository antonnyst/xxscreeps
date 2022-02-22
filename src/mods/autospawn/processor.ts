import {
	registerIntentProcessor, registerObjectPreTickProcessor,
} from 'xxscreeps/engine/processor';
import * as C from 'xxscreeps/game/constants';
import * as ControllerProc from 'xxscreeps/mods/controller/processor';

import { RoomPosition } from 'xxscreeps/game/position';
import { Room } from 'xxscreeps/game/room/';
import { ConstructionSite } from 'xxscreeps/mods/construction/construction-site';
import { structureFactories } from 'xxscreeps/mods/construction/symbols';
import { StructureController } from 'xxscreeps/mods/controller/controller';
import { createRuin } from 'xxscreeps/mods/structure/ruin';
import { OwnedStructure } from 'xxscreeps/mods/structure/structure';
import { Game, me } from 'xxscreeps/game';
import { create } from 'xxscreeps/mods/spawn/spawn';

registerObjectPreTickProcessor(StructureController, (controller, context) => {
	if (controller.level === 0) {
		if (controller.room['#autoSpawn']) {
			controller.room['#autoSpawn'] = false;
			context.didUpdate();
		}
	}
});

registerObjectPreTickProcessor(ConstructionSite, (site, context) => {
	if (site.structureType === 'spawn' && site.room['#autoSpawn']) {
		const { room } = site;
		const structure = structureFactories.get(site.structureType)?.create(site, site.name);
		site.room['#removeObject'](site);
		room['#autoSpawn'] = false;
		if (structure) {
			room['#insertObject'](structure, true);
		}
		context.didUpdate();
	}
});

const intents = [
	registerIntentProcessor(
		Room,
		'placeSpawn',
		{ internal: true, before: 'placeSpawn' },
		(room, context, xx: number, yy: number, name: string) => {
			const pos = new RoomPosition(xx, yy, room.name);
			if (room['#user'] === null) {
				// Remove existing objects
				for (const object of room['#objects']) {
					if (object['#user'] === null) {
						if (object.hits !== undefined) {
							room['#removeObject'](object);
						}
					} else if (object instanceof OwnedStructure) {
						const ruin = createRuin(object, 100000);
						room['#insertObject'](ruin);
						room['#removeObject'](object);
					} else {
						room['#removeObject'](object);
					}
				}
				// Set up initial player state
				ControllerProc.claim(context, room.controller!, me);
				if (name === 'auto') {
					room['#autoSpawn'] = true;
				} else {
					room['#insertObject'](create(pos, me, name));
				}
				room['#cumulativeEnergyHarvested'] = 0;
				room['#safeModeUntil'] = Game.time + C.SAFE_MODE_DURATION;
				context.didUpdate();
			}
		},
	),
];

declare module 'xxscreeps/engine/processor' {
	interface Intent {
		autoSpawn: typeof intents;
	}
}
