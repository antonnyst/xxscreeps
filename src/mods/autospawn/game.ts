import { registerStruct } from 'xxscreeps/engine/schema';

// Register schema
const roomSchema = registerStruct('Room', {
	'#autoSpawn': 'bool',
});

declare module 'xxscreeps/game/room' {
	interface Schema {
		autoSpawn: [typeof roomSchema];
	}
}
