import { randInt, subgroupArray } from "@utils/math";
import { addParamsToUrl, getParamsFromUrl } from "@utils/url";

let token;
const endpoint = "https://freesound.org/apiv2/search/text";

const addFiltersToUrl = (url, newFilters) => {
    const existingFiltersString = getParamsFromUrl(url).filter;
    const existingFiltersObj = existingFiltersString ? Object.fromEntries(subgroupArray(existingFiltersString.split(/\s?(\w+):/).slice(1), 2)) : {};
    const filtersObj = {...existingFiltersObj, ...newFilters};
    const filtersString = Object.entries(filtersObj).map(entry => entry.join(":")).join(" ");
    return addParamsToUrl(url, {filter: filtersString});
}

export const authenticate = async (candidateKey) => {
    const url = addParamsToUrl(endpoint, {token: candidateKey})
    const response = await fetch(url);
    if (response.ok) token = candidateKey;
    return response.ok;
}

const getSoundCount = async (url) => {
    url = addParamsToUrl(url, {page_size:1, fields:null});
    const response = await fetch(url);
    return (await response.json()).count
}

const cleanResult = result => {
    result.freesound_id = result.id
    delete result.id
    result.author = result.username;
    delete result.username;
    result.date = result.created;
    delete result.created;
    result.url = result.previews["preview-hq-ogg"];
    delete result.previews;
    if (!result.is_explicit) delete result.is_explicit
    return result;
}

// In the freesound api, instance is the data about the sound. different from SoundInstance in Soundpot.
const getSoundInstanceWithNumber = async (url, number) => {
    url = addParamsToUrl(url, {page_size:1, page:number, fields:"id,name,username,previews,created,is_explicit"})
    const response = await fetch(url);
    const result = (await response.json()).results[0];
    return cleanResult(result);
}

let soundCount;
export const getRandomSound = async options => {
    const { allowExplicit, signal } = options;
    let url = addParamsToUrl(endpoint, { token });
    const filters = {duration: "[1 TO 10]", license: '("Creative Commons 0" OR "Attribution")'};
    if (!allowExplicit) filters.is_explicit = false
    url = addFiltersToUrl(url, filters);
    soundCount = soundCount ?? await getSoundCount(url);
    const soundMetadata = await getSoundInstanceWithNumber(url, randInt(soundCount));
    return fetch(soundMetadata.url, { signal })
    .then(response => response.blob())
    .then(sound => {
        delete soundMetadata.url;
        return [sound, soundMetadata]
    })
    .catch(_e => []);
}
