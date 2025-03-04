import { randInt } from "@utils/math";
import { addParamsToUrl } from "@utils/url";

let token;
const endpoint = "https://freesound.org/apiv2/search/text";

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
    return result;
}

// In the freesound api, instance is the data about the sound. different from SoundInstance in Soundpot.
const getSoundInstanceWithNumber = async (url, number) => {
    url = addParamsToUrl(url, {page_size:1, page:number, fields:"id,name,username,previews,created"})
    const response = await fetch(url);
    const result = (await response.json()).results[0];
    return cleanResult(result);
}

let soundCount;
export const getRandomSound = async () => {
    const filter = 'duration:[1 TO 10] license:("Creative Commons 0" OR "Attribution")'
    const url = addParamsToUrl(endpoint, {token, filter});
    soundCount = soundCount ?? await getSoundCount(url);
    const soundMetadata = await getSoundInstanceWithNumber(url, randInt(soundCount));
    const sound = await (await fetch(soundMetadata.url)).blob()
    delete soundMetadata.url;
    return [sound, soundMetadata]
}
