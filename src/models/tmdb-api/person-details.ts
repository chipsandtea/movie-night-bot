import { Person } from './person.js';

export class PersonDetails extends Person {
    also_known_as: string[];
    biography: string;
    birthday: Date;
    deathday: Date;
    gender: number;
    homepage: string;
    imdb_id: string;
    place_of_birth: string;
}
