import type { TitleLanguage } from "$lib/stores/titleLanguage";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sourceOf(input: any): any {
  return input?.entry || input?.media || input || {};
}

export function getEnglishAnimeTitle(input: any): string {
  const source = sourceOf(input);
  const title = typeof source.title === "object" ? source.title : {};
  const flattened = typeof source.title === "string" ? source.title : "";
  const candidates = [
    source.title_english, source.englishTitle, title.english, title.userPreferred,
    flattened, source.name, source.userPreferred, source.title_romaji,
    title.romaji, source.title_japanese, source.title_native, title.native,
  ];
  return candidates.map(asText).find(Boolean) || "Untitled anime";
}

export function getJapaneseAnimeTitle(input: any): string {
  const source = sourceOf(input);
  const title = typeof source.title === "object" ? source.title : {};
  const flattened = typeof source.title === "string" ? source.title : "";
  const candidates = [
    source.title_japanese, source.title_native, source.japaneseTitle,
    source.nativeTitle, source.jname, title.native, source.title_romaji,
    title.romaji, title.userPreferred, source.title_english, title.english,
    flattened, source.name, source.userPreferred,
  ];
  return candidates.map(asText).find(Boolean) || "タイトル未定";
}

export function getAnimeTitle(input: any, language: TitleLanguage): string {
  return language === "japanese"
    ? getJapaneseAnimeTitle(input)
    : getEnglishAnimeTitle(input);
}
