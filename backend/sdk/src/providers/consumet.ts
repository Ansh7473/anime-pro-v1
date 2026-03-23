import { TatakaiClient } from "../index";

export class ConsumetProvider {
    constructor(private client: TatakaiClient) { }

    async animeSearch(provider: string, query: string) {
        return this.client.request(`/consumet/anime/\${provider}/\${encodeURIComponent(query)}`);
    }

    async animeInfo(provider: string, id: string) {
        return this.client.request(`/consumet/anime/\${provider}/info/\${id}`);
    }

    async animeEpisodeSources(provider: string, episodeId: string) {
        return this.client.request(`/consumet/anime/\${provider}/watch/\${episodeId}`);
    }

    async mangaSearch(provider: string, query: string) {
        return this.client.request(`/consumet/manga/\${provider}/\${encodeURIComponent(query)}`);
    }
}
