import { ANIME } from "@consumet/extensions";

export interface AnimeSearchResult {
    id: string;
    title: string;
    url: string;
    poster?: string;
    status?: string;
    type?: string;
    episodes?: number;
    sub?: number;
    dub?: number;
    year?: string;
    score?: string;
    session: string; // Unified ID
}

export interface Episode {
    id: string;
    episodeNumber: number;
    url: string;
    title?: string;
    duration?: string;
    date?: string;
    snapshot?: string;
    session: string;
    isSubbed?: boolean;
    isDubbed?: boolean;
    isFiller?: boolean;
}

export interface StreamLink {
    quality: string;
    audio: string;
    url: string;
    directUrl?: string;
    isHls: boolean;
}

export interface StreamResponse {
    headers: Record<string, string>;
    sources: StreamLink[];
    subtitles?: { url: string; lang: string }[];
}

export class AniwatchScraper {
    private provider: InstanceType<typeof ANIME.AnimePahe>;

    constructor() {
        this.provider = new ANIME.AnimePahe();
    }

    async close() {
        // No browser instance to close with Consumet
    }

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const res = await this.provider.search(query);
            return (res.results || []).map((item: any) => ({
                id: item.id,
                session: item.id,
                title: typeof item.title === 'object' ? (item.title.english || item.title.romaji || item.title.native || '') : (item.title as string),
                url: `/anime/${item.id}`,
                poster: item.image,
                type: item.type,
                episodes: item.episodes || item.totalEpisodes,
            }));
        } catch (error) {
            console.error('AnimePahe search error:', error);
            return [];
        }
    }

    async getEpisodes(
        animeSessionId: string,
        pageNum: number = 1,
        debug: boolean = false
    ): Promise<{ episodes: Episode[], lastPage: number, raw?: string }> {
        try {
            const info = await this.provider.fetchAnimeInfo(animeSessionId);
            const eps = (info.episodes || []) as any[];
            const episodes: Episode[] = eps.map((ep: any) => ({
                id: ep.id,
                session: ep.id,
                episodeNumber: ep.number,
                url: `/play/${animeSessionId}/${ep.id}`,
                title: ep.title,
                // AnimePahe uses isDub (true = dubbed, false = subbed)
                isSubbed: ep.isDub === false,
                isDubbed: ep.isDub === true,
            }));

            return { episodes, lastPage: 1 };
        } catch (error) {
            console.error('AnimePahe getEpisodes error:', error);
            return { episodes: [], lastPage: 1 };
        }
    }

    async getLinks(animeSession: string, episodeSession: string): Promise<StreamResponse | null> {
        try {
            const res = await this.provider.fetchEpisodeSources(episodeSession);
            const sources = (res.sources || []).map((source: any) => ({
                quality: source.quality || 'auto',
                audio: 'sub',
                url: source.url,
                directUrl: source.url,
                isHls: source.isM3U8 || false,
            }));

            // AnimePahe may not provide subtitle tracks
            const subtitles = (res.subtitles || []).map((sub: any) => ({
                url: sub.url,
                lang: sub.lang || sub.language || 'Unknown'
            }));

            return { headers: res.headers || {}, sources, subtitles };
        } catch (error) {
            console.error('AnimePahe getLinks error:', error);
            return null;
        }
    }
}
