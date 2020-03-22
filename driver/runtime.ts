import type ivm from 'isolated-vm';
import lodash from 'lodash';

import { Creep } from '~/engine/game/creep';
import { Game } from '~/engine/game/game';
import { RoomPosition } from '~/engine/game/position';
import { Room } from '~/engine/game/room';
import { Source } from '~/engine/game/source';

import * as Constants from '~/engine/game/constants';
import { gameContext, IntentManager } from '~/engine/game/context';
import { finalizePrototypeGetters } from '~/engine/game/schema';
import { UserCode } from '~/engine/metabase/code';
import { BufferView } from '~/engine/schema/buffer-view';

const { stringify } = JSON;

declare const global: any;

// Global lodash compatibility
global._ = lodash;

// Export prototypes
global.Creep = Creep;
global.RoomPosition = RoomPosition;
global.Source = Source;

// Set up lazy schema getters
finalizePrototypeGetters();

// Export constants
for (const [ identifier, value ] of Object.entries(Constants)) {
	global[identifier] = value;
}

let require: (name: string) => any;
export function initialize(isolate: ivm.Isolate, context: ivm.Context, userId: string, userCode: UserCode) {
	gameContext.userId = userId;
	// Index code by name
	const modulesCode = Object.create(null);
	for (const { name, data } of userCode.modules) {
		modulesCode[name] = data;
	}
	delete userCode.modules;
	// Set up global `require`
	const cache = Object.create(null);
	global.require = require = name => {
		// Check cache
		const cached = cache[name];
		if (cached !== undefined) {
			if (cached === null) {
				throw new Error(`Circular reference to module: ${name}`);
			}
			return cached;
		}
		const code = modulesCode[name];
		if (code === undefined) {
			throw new Error(`Unknown module: ${name}`);
		}
		cache[name] = null;
		// Compile module and execute
		const module = {
			exports: {} as any,
		};
		const script = isolate.compileScriptSync(
			`(function(module,exports){${code}})`, { filename: `${name}.js` });
		const moduleFunction = script.runSync(context, { reference: true }).deref();
		const run = () => moduleFunction.apply(module, [ module, module.exports ]);
		run();
		if (name === 'main' && module.exports.loop === undefined) {
			// If user doesn't have `loop` it means the first tick already run. Simulate a proper `loop`
			// method which runs the second time this is called.
			const loop = () => run();
			module.exports.loop = () => module.exports.loop = loop;
		}
		// Cache executed module and release code string (maybe it frees memory?)
		cache[name] = module;
		delete modulesCode[name];
		return module.exports;
	};
}

export function tick(time: number, roomBlobs: Readonly<Uint8Array>[]) {
	// Reset context
	gameContext.createdCreepNames = new Set;
	gameContext.intents = new IntentManager;
	// Build game object
	const rooms = roomBlobs.map(buffer =>
		new Room(new BufferView(buffer.buffer, buffer.byteOffset)));
	global.Game = new Game(time, rooms);
	// Run player loop
	require('main').loop();
	// Return JSON'd intents
	return stringify(gameContext.intents);
}
