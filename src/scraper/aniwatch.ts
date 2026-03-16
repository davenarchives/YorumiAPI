import { HiAnime } from "aniwatch";

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
    private scraper: InstanceType<typeof HiAnime.Scraper>;

    constructor() {
        this.scraper = new HiAnime.Scraper();
    }

    async close() {}

    async search(query: string): Promise<AnimeSearchResult[]> {
        try {
            const res = await this.scraper.search(query, 1);
            return (res.animes || []).map((item: any) => ({
                id: item.id,
                session: item.id,
                title: item.name,
                url: `/anime/${item.id}`,
                poster: item.poster,
                type: item.type,
                episodes: item.episodes?.sub || item.episodes?.dub || 0,
                sub: item.episodes?.sub,
                dub: item.episodes?.dub,
            }));
        } catch (error) {
            console.error('aniwatch search error:', error);
            return [];
        }
    }

    async getEpisodes(
        animeSessionId: string,
        pageNum: number = 1,
        debug: boolean = false
    ): Promise<{ episodes: Episode[], lastPage: number, raw?: string }> {
        try {
            const res = await this.scraper.getEpisodes(animeSessionId);
            const eps = (res.episodes || []) as any[];
            return {
                episodes: eps.map((ep: any) => ({
                    id: ep.episodeId,
                    session: ep.episodeId,
                    episodeNumber: ep.number,
                    url: `/play/${animeSessionId}/${ep.episodeId}`,
                    title: ep.title,
                    isFiller: ep.isFiller,
                    // aniwatch package doesn't provide per-episode sub/dub flags in the list
                    isSubbed: true, 
                    isDubbed: false,
                })),
                lastPage: 1
            };
        } catch (error) {
            console.error('aniwatch getEpisodes error:', error);
            return { episodes: [], lastPage: 1 };
        }
    }

    async getLinks(animeSession: string, episodeSession: string): Promise<StreamResponse | null> {
        try {
            // HiAnime requires checking servers first
            const servers = await this.scraper.getEpisodeServers(episodeSession);
            if (!servers.sub?.length && !servers.dub?.length && !servers.raw?.length) {
                return null;
            }

            const res = await this.scraper.getEpisodeSources(episodeSession);
            const sources = (res.sources || []).map((source: any) => ({
                quality: 'auto',
                audio: 'sub',
                url: source.url,
                directUrl: source.url,
                isHls: source.url.includes('.m3u8') || source.type === 'hls',
            }));
            const subtitles = (res.subtitles || []).map((sub: any) => ({
                url: sub.url,
                lang: sub.lang || sub.language || 'Unknown',
            }));
            return { headers: { 'Referer': 'https://hianime.to' }, sources, subtitles };
        } catch (error) {
            console.error('aniwatch getLinks error:', error);
            return null;
        }
    }
}
