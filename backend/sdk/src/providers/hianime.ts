import { TatakaiClient } from "../index";

export class HiAnimeProvider {
    constructor(private client: TatakaiClient) { }

    async getHome() {
        return this.client.request("/hianime/home");
    }

    async getInfo(id: string) {
        return this.client.request(`/hianime/info/\${id}`);
    }

    async getEpisodes(id: string) {
        return this.client.request(`/hianime/episodes/\${id}`);
    }

    async getStreamingLinks(episodeId: string, server?: string, category?: string) {
        const params = new URLSearchParams();
        if (server) params.append("server", server);
        if (category) params.append("category", category);
        return this.client.request(`/hianime/servers/\${episodeId}?\${params.toString()}`);
    }

    async search(query: string, page: number = 1) {
        return this.client.request(`/hianime/search?q=\${encodeURIComponent(query)}&page=\${page}`);
    }
}
