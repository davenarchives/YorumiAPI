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
    session: string;
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
    private animekai: InstanceType<typeof ANIME.AnimeKai>;
    private animepahe: InstanceType<typeof ANIME.AnimePahe>;

    constructor() {
        this.animekai = new ANIME.AnimeKai();
        this.animepahe = new ANIME.AnimePahe();
    }

    async close() {}

    async search(query: string): Promise<AnimeSearchResult[]> {
        // Try AnimeKai first (better metadata + subtitles), fall back to AnimePahe on servers where Cloudflare blocks
        try {
            const res = await this.animekai.search(query);
            const results = (res.results || []).map((item: any) => ({
                id: item.id,
                session: item.id,
                title: typeof item.title === 'object' ? (item.title.english || item.title.romaji || item.title.native || '') : (item.title as string),
                url: `/anime/${item.id}`,
                poster: item.image,
                type: item.type,
                episodes: item.episodes || item.totalEpisodes,
                sub: item.sub,
                dub: item.dub,
            }));
            if (results.length > 0) return results;
            console.warn('[Search] AnimeKai returned empty — falling back to AnimePahe');
        } catch (err) {
            console.warn('[Search] AnimeKai failed — falling back to AnimePahe:', (err as Error).message);
        }

        try {
            const res = await this.animepahe.search(query);
            return (res.results || []).map((item: any) => ({
                id: item.id,
                session: item.id,
                title: typeof item.title === 'object' ? (item.title.english || item.title.romaji || item.title.native || '') : (item.title as string),
                url: `/anime/${item.id}`,
                poster: item.image,
                type: item.type,
                episodes: item.episodes || item.totalEpisodes,
            }));
        } catch (err) {
            console.error('[Search] AnimePahe fallback also failed:', err);
            return [];
        }
    }

    async getEpisodes(
        animeSessionId: string,
        pageNum: number = 1,
        debug: boolean = false
    ): Promise<{ episodes: Episode[], lastPage: number, raw?: string }> {
        // Try AnimeKai first, fall back to AnimePahe
        try {
            const info = await this.animekai.fetchAnimeInfo(animeSessionId);
            const eps = (info.episodes || []) as any[];
            if (eps.length > 0) {
                return {
                    episodes: eps.map((ep: any) => ({
                        id: ep.id,
                        session: ep.id,
                        episodeNumber: ep.number,
                        url: `/play/${animeSessionId}/${ep.id}`,
                        title: ep.title,
                        isSubbed: ep.isSubbed,
                        isDubbed: ep.isDubbed,
                        isFiller: ep.isFiller,
                    })),
                    lastPage: 1
                };
            }
            console.warn('[Episodes] AnimeKai returned empty — falling back to AnimePahe');
        } catch (err) {
            console.warn('[Episodes] AnimeKai failed — falling back to AnimePahe:', (err as Error).message);
        }

        try {
            const info = await this.animepahe.fetchAnimeInfo(animeSessionId);
            const eps = (info.episodes || []) as any[];
            return {
                episodes: eps.map((ep: any) => ({
                    id: ep.id,
                    session: ep.id,
                    episodeNumber: ep.number,
                    url: `/play/${animeSessionId}/${ep.id}`,
                    title: ep.title,
                    isSubbed: ep.isDub === false,
                    isDubbed: ep.isDub === true,
                })),
                lastPage: 1
            };
        } catch (err) {
            console.error('[Episodes] AnimePahe fallback also failed:', err);
            return { episodes: [], lastPage: 1 };
        }
    }

    async getLinks(animeSession: string, episodeSession: string): Promise<StreamResponse | null> {
        // Try AnimeKai first (has subtitles), fall back to AnimePahe
        try {
            const res = await this.animekai.fetchEpisodeSources(episodeSession);
            const sources = (res.sources || []).map((source: any) => ({
                quality: source.quality || 'auto',
                audio: 'sub',
                url: source.url,
                directUrl: source.url,
                isHls: source.isM3U8 || false,
            }));
            if (sources.length > 0) {
                const subtitles = (res.subtitles || []).map((sub: any) => ({
                    url: sub.url,
                    lang: sub.lang || sub.language || 'Unknown'
                }));
                return { headers: res.headers || {}, sources, subtitles };
            }
            console.warn('[Links] AnimeKai returned empty sources — falling back to AnimePahe');
        } catch (err) {
            console.warn('[Links] AnimeKai failed — falling back to AnimePahe:', (err as Error).message);
        }

        try {
            const res = await this.animepahe.fetchEpisodeSources(episodeSession);
            const sources = (res.sources || []).map((source: any) => ({
                quality: source.quality || 'auto',
                audio: 'sub',
                url: source.url,
                directUrl: source.url,
                isHls: source.isM3U8 || false,
            }));
            return { headers: res.headers || {}, sources, subtitles: [] };
        } catch (err) {
            console.error('[Links] AnimePahe fallback also failed:', err);
            return null;
        }
    }
}
