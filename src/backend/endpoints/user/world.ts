import * as User from 'xxscreeps/engine/db/user';
import { hooks } from 'xxscreeps/backend';

hooks.register('route', {
	path: '/api/user/respawn-prohibited-rooms',

	execute() {
		return {
			ok: 1,
			rooms: [],
		};
	},
});

hooks.register('route', {
	path: '/api/user/world-start-room',

	async execute(context) {
		const { userId } = context.state;
		if (userId) {
			const lastRoom = await context.db.data.hget(User.infoKey(userId), 'lastViewedRoom');
			if (lastRoom !== null && context.backend.world.map.getRoomStatus(lastRoom)) {
				return {
					ok: 1,
					room: [ lastRoom ],
				};
			}
		}
		return {
			ok: 1,
			room: [ 'W5N5' ],
		};
	},
});

hooks.register('roomSocket', async(shard, userId, roomName) => {
	if (userId !== undefined) {
		await shard.db.data.hset(User.infoKey(userId), 'lastViewedRoom', roomName);
	}
});
