import { plainToClass } from 'class-transformer';
import {
  ChatInputCommandInteraction,
  PermissionsString,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { createRequire } from 'node:module';
import { Client } from 'undici';

import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import { MovieDetails } from '../../models/tmdb-api/movie-details.js';
import { SearchResult } from '../../models/tmdb-api/search-result.js';
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
  public client = new Client(`https://api.themoviedb.org`);

  public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
    const intrUser = await intr.guild.members.fetch(intr.user.id);
    const username = intrUser.user.username;
    console.log(username);

    const reqHeaders = {
      Authorization: `Bearer ${Config.tmdb.token}`,
      'Content-Type': 'application/json;charset=utf-8',
    };

    const addMovieModal = this.generateModal();

    await intr.showModal(addMovieModal);
    const submitted = await intr
      .awaitModalSubmit({
        time: 60000,
        filter: i => i.user.id === intr.user.id,
      })
      .catch(error => {
        console.error(error);
        return null;
      });

    const movieQuery = submitted.fields.getTextInputValue('movieQueryInput');
    const year = submitted.fields.getTextInputValue('movieYearInput');

    // Verify v4 reader token pattern.
    const movieSearchQuery = this.generateMovieSearchQuery(movieQuery, year);
    const { body, headers, statusCode, trailers } = await this.client.request({
      path: movieSearchQuery,
      method: 'GET',
      headers: reqHeaders,
    });

    const resp = await body.json();
    const transformed = plainToClass(SearchResult<MovieDetails>, resp);
    const movieDetails = this.getMovieDetails(transformed);

    if (movieDetails != null) {
      await InteractionUtils.send(
        submitted,
        Lang.getEmbed('displayEmbeds.add', data.lang, this.getEmbedVars(username, movieDetails))
      );
    } else {
      await InteractionUtils.send(intr, 'Unable to find movie :(');
    }
  }

  private generateModal(): ModalBuilder {
    const modal = new ModalBuilder().setCustomId('addMovieModal').setTitle('Search for a movie');

    const movieQueryInput = new TextInputBuilder()
      .setCustomId('movieQueryInput')
      .setLabel('Search for a movie by name.')
      .setRequired(true)
      .setMaxLength(500)
      .setStyle(TextInputStyle.Short);
    const movieYearInput = new TextInputBuilder()
      .setCustomId('movieYearInput')
      .setLabel('Release year (Optional)')
      .setPlaceholder('YYYY')
      .setRequired(false)
      .setMaxLength(4)
      .setStyle(TextInputStyle.Short);
    const movieQueryActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      movieQueryInput
    );
    const movieYearActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      movieYearInput
    );
    modal.addComponents(movieQueryActionRow, movieYearActionRow);

    return modal;
  }

  private generateMovieSearchQuery(movieQuery: string, year?: string): string {
    const yearQuery = year != null && year !== '' ? `&year=${year}` : '';
    return `/3/search/movie?query=${encodeURIComponent(movieQuery)}${yearQuery}`;
  }

  private generateMovieImageUrl(posterPath: string): string {
    return `https://image.tmdb.org/t/p/original${posterPath}`;
  }

  /**
   * Tries to return the MovieDetails of the movie the user requested. If the search term yielded multiple movies, return the most popular movie (assuming that the most popular title was the one intended).
   * @param response The search response from TMDB search movies endpoint.
   * @returns A single MovieDetails object, or null if no Movie was returned.
   */
  private getMovieDetails(response: SearchResult<MovieDetails>): MovieDetails | null {
    if (response.total_results === 0) return null;

    const results = response.results;
    if (response.total_results === 1) {
      return results[0];
    }
    if (response.total_results > 1) {
      results.sort((a, b) => {
        if (a.popularity > b.popularity) return -1;
        if (a.popularity < b.popularity) return 1;
      });
      return results[0];
    }
  }

  private getEmbedVars(username: string, movieDetails: MovieDetails): { [name: string]: string } {
    return {
      ADD_USER_NAME: username,
      ADD_MOVIE_NAME: movieDetails.original_title,
      ADD_MOVIE_YEAR: movieDetails.release_date,
      ADD_MOVIE_DESC: movieDetails.overview,
      ADD_MOVIE_POSTER_PATH: this.generateMovieImageUrl(movieDetails.poster_path),
    };
  }
}
