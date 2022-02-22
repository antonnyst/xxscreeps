import type { Manifest } from 'xxscreeps/config/mods';
export const manifest: Manifest = {
	dependencies: [
		'xxscreeps/mods/controller',
		'xxscreeps/mods/spawn',
		'xxscreeps/mods/structure',
		'xxscreeps/mods/construction',
	],
	provides: [ 'game', 'processor' ],
};
