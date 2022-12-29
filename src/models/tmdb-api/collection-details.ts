import { Collection } from './collection.js';
import { Movie } from './movie';

export class CollectionDetails extends Collection {
    overview: string;
    parts: Movie[];
}
