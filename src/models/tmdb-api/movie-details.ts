import { Collection } from './collection.js';
import { Company } from './company.js';
import { Country } from './country.js';
import { Genre } from './genre.js';
import { Language } from './language.js';
import { Movie } from './movie.js';

export class MovieDetails extends Movie {
    belongs_to_collection: Collection;
    budget: number;
    genres: Genre[];
    homepage: string;
    imdb_id: string;
    production_companies: Company[];
    production_countries: Country[];
    revenue: number;
    runtime: number;
    spoken_languages: Language[];
    status: string;
    tagline: string;
}
