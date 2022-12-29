import { ChatInputCommandInteraction, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { createRequire } from 'node:module';
import { Client } from 'undici';

import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import { Lang } from '../../services/index.js';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

const require = createRequire(import.meta.url);
let Config = require('../../../config/config.json');

export class AddCommand implements Command {
    public names = [Lang.getRef('chatCommands.add', Language.Default)];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];
    public client = new Client(`https://api.themoviedb.org/`);

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const reqHeaders = {
            Authorization: `Bearer ${Config.tmdb.token}`,
            'Content-Type': 'application/json;charset=utf-8',
        };

        // Verify v4 reader token pattern.
        const { body, headers, statusCode, trailers } = await this.client.request({
            path: '/3/movie/76341',
            method: 'GET',
            headers: reqHeaders,
        });

        const resp = await body.json();
        console.log(resp);

        console.log(body);
        await InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.add', data.lang));
    }
}
